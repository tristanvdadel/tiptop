
import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Info, TrendingUp, ArrowRight, AlertTriangle, AlertCircle } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import TipChart from '@/components/TipChart';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { getUserTeamsSafe } from '@/services/teamService';
import { useNavigate } from 'react-router-dom';

interface HistoricalPeriod {
  id: string;
  startDate: string;
  endDate: string | null;
  isPaid: boolean;
  averageTipPerHour: number | null;
  totalTips: number;
  payoutDate: string | null;
}

interface PeriodChartData {
  name: string;
  total: number;
  average: number;
  id: string;
  isPaid: boolean;
  timestamp: number;
  isHistorical?: boolean;
}

const Analytics = () => {
  const {
    periods,
    calculateAverageTipPerHour,
    teamMembers,
    payouts,
    teamId,
    refreshTeamData
  } = useApp();
  
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [localTeamId, setLocalTeamId] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalPeriod[]>([]);
  
  useEffect(() => {
    const fetchTeamID = async () => {
      try {
        if (teamId) {
          console.log("Analytics.tsx: Team ID from context:", teamId);
          setLocalTeamId(teamId);
          return;
        }
        
        console.log("Analytics.tsx: Team ID not found in context, fetching manually");
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          console.log("Analytics.tsx: No session found");
          return;
        }
        
        const teams = await getUserTeamsSafe(session.user.id);
        if (teams && teams.length > 0) {
          console.log("Analytics.tsx: Found team ID from API:", teams[0].id);
          setLocalTeamId(teams[0].id);
        } else {
          console.log("Analytics.tsx: No teams found for user");
        }
      } catch (error) {
        console.error("Error fetching team ID:", error);
      }
    };
    
    fetchTeamID();
  }, [teamId]);
  
  // Fetch historical payout data to supplement current data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      const effectiveTeamId = localTeamId || teamId;
      if (!effectiveTeamId) return;
      
      try {
        console.log("Analytics.tsx: Fetching historical payout data");
        
        // Get all payouts for this team
        const { data: payoutsData, error: payoutsError } = await supabase
          .from('payouts')
          .select(`
            id,
            date,
            payout_time,
            payout_periods (
              period_id
            ),
            payout_distributions (
              team_member_id,
              amount,
              actual_amount,
              balance
            )
          `)
          .eq('team_id', effectiveTeamId);
          
        if (payoutsError) {
          console.error("Analytics.tsx: Error fetching historical payout data:", payoutsError);
          return;
        }
        
        if (!payoutsData || payoutsData.length === 0) {
          console.log("Analytics.tsx: No historical payout data found");
          return;
        }
        
        console.log("Analytics.tsx: Found historical payout data:", payoutsData.length, "payouts");
        
        // Extract all period IDs from payouts
        const periodIds = payoutsData
          .flatMap(payout => payout.payout_periods?.map(pp => pp.period_id) || [])
          .filter(id => id);
          
        if (periodIds.length === 0) {
          console.log("Analytics.tsx: No period IDs found in payouts");
          return;
        }
        
        // Get period data for these periods
        const { data: periodsData, error: periodsError } = await supabase
          .from('periods')
          .select(`
            id,
            start_date,
            end_date,
            is_paid,
            average_tip_per_hour,
            tips (
              id,
              amount,
              date
            )
          `)
          .in('id', periodIds);
          
        if (periodsError) {
          console.error("Analytics.tsx: Error fetching historical period data:", periodsError);
          return;
        }
        
        if (!periodsData || periodsData.length === 0) {
          console.log("Analytics.tsx: No historical period data found");
          return;
        }
        
        console.log("Analytics.tsx: Found historical period data:", periodsData.length, "periods");
        
        // Combine this data
        const historicalPeriods = periodsData.map(period => {
          const relatedPayout = payoutsData.find(p => 
            p.payout_periods?.some(pp => pp.period_id === period.id)
          );
          
          const totalTips = period.tips?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
          
          return {
            id: period.id,
            startDate: period.start_date,
            endDate: period.end_date,
            isPaid: period.is_paid,
            averageTipPerHour: period.average_tip_per_hour,
            totalTips,
            payoutDate: relatedPayout?.date
          };
        });
        
        setHistoricalData(historicalPeriods);
        console.log("Analytics.tsx: Historical data prepared:", historicalPeriods.length, "items");
      } catch (error) {
        console.error("Analytics.tsx: Error in fetchHistoricalData:", error);
      }
    };
    
    fetchHistoricalData();
  }, [localTeamId, teamId, payouts]);
  
  useEffect(() => {
    const loadData = async () => {
      const effectiveTeamId = localTeamId || teamId;
      
      if (!effectiveTeamId) {
        console.log("Analytics.tsx: No team ID found, can't load data");
        setHasError(true);
        setErrorMessage("Geen team ID gevonden. Ga naar het dashboard om een team aan te maken of lid te worden van een team.");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setHasError(false);
      setErrorMessage(null);
      
      try {
        await refreshTeamData();
        console.log("Analytics.tsx: Data loaded successfully");
      } catch (error) {
        console.error("Error loading team data on Analytics page:", error);
        setHasError(true);
        setErrorMessage("Er is een fout opgetreden bij het laden van de analysegegevens. Probeer het opnieuw.");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [localTeamId, teamId, refreshTeamData]);
  
  // Combined average tip calculation using both current and historical data
  const averageTipPerHour = useMemo(() => {
    // First calculate from current data
    const currentAverage = calculateAverageTipPerHour();
    
    // If we have no historical data, return current calculation
    if (historicalData.length === 0) {
      return currentAverage;
    }
    
    // Calculate total tips and hours from historical data
    const historicalTips = historicalData.reduce((sum, period) => {
      return sum + (period.totalTips || 0);
    }, 0);
    
    // Get historical averages where we have values
    const historicalAverages = historicalData
      .filter(period => period.averageTipPerHour !== null && period.averageTipPerHour !== undefined)
      .map(period => period.averageTipPerHour);
    
    if (historicalAverages.length === 0) {
      // No historical averages available
      return currentAverage;
    }
    
    // Return weighted average
    // If current average is 0 or not available, return historical average
    if (!currentAverage || currentAverage === 0) {
      const avgSum = historicalAverages.reduce((sum, avg) => sum + avg, 0);
      return avgSum / historicalAverages.length;
    }
    
    // Return weighted average between current and historical
    const allAverages = [...historicalAverages, currentAverage];
    const avgSum = allAverages.reduce((sum, avg) => sum + avg, 0);
    return avgSum / allAverages.length;
  }, [calculateAverageTipPerHour, historicalData]);
  
  // Combined data for charts that includes both current and historical periods
  const periodData = useMemo(() => {
    // Process current periods
    const currentPeriodsData: PeriodChartData[] = periods.map(period => {
      let avgTipPerHour = period.averageTipPerHour;
      
      if (avgTipPerHour === undefined || avgTipPerHour === null) {
        avgTipPerHour = calculateAverageTipPerHour(period.id);
      }
      
      const totalTips = period.tips.reduce((sum, tip) => sum + tip.amount, 0);
      const startDate = format(new Date(period.startDate), 'd MMM', {
        locale: nl
      });
      const endDate = period.endDate ? format(new Date(period.endDate), 'd MMM', {
        locale: nl
      }) : 'Actief';
      
      const timestamp = new Date(period.startDate).getTime();
      return {
        name: `${startDate} - ${endDate}`,
        total: totalTips,
        average: avgTipPerHour || 0,
        id: period.id,
        isPaid: period.isPaid,
        timestamp: timestamp,
        isHistorical: false
      };
    });
    
    // Process historical periods that are not in current periods
    const currentPeriodIds = periods.map(p => p.id);
    
    const historicalPeriodsData: PeriodChartData[] = historicalData
      .filter(hp => !currentPeriodIds.includes(hp.id))
      .map(hp => {
        const startDate = format(new Date(hp.startDate), 'd MMM', {
          locale: nl
        });
        const endDate = hp.endDate ? format(new Date(hp.endDate), 'd MMM', {
          locale: nl
        }) : '';
        
        const timestamp = new Date(hp.startDate).getTime();
        return {
          name: `${startDate} - ${endDate}`,
          total: hp.totalTips || 0,
          average: hp.averageTipPerHour || 0,
          id: hp.id,
          isPaid: true,
          timestamp: timestamp,
          isHistorical: true
        };
      });
    
    // Combine and sort by timestamp
    return [...currentPeriodsData, ...historicalPeriodsData]
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [periods, calculateAverageTipPerHour, historicalData]);
  
  const lineChartData = useMemo(() => {
    const filteredData = periodData.filter(period => period.average > 0 || period.total > 0);
    if (filteredData.length > 10) {
      return filteredData.slice(-10);
    }
    return filteredData;
  }, [periodData]);
  
  const chartConfig = useMemo(() => {
    return {
      average: {
        label: 'Gem. fooi per uur',
        color: '#33C3F0'
      }
    };
  }, []);
  
  const getEmptyStateMessage = () => {
    const allPeriods = periods;
    const periodsWithTips = allPeriods.some(period => period.tips.length > 0);
    const teamHasHours = teamMembers.some(member => member.hours > 0 || member.hourRegistrations && member.hourRegistrations.length > 0);
    if (!periodsWithTips && !teamHasHours) {
      return "Er ontbreken uur gegevens en fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
    } else if (!periodsWithTips) {
      return "Er ontbreken fooi gegevens. Voeg ze toe om een gemiddelde te zien.";
    } else if (!teamHasHours) {
      return "Er ontbreken uur gegevens. Voeg ze toe om een gemiddelde te zien.";
    }
    return ""; // Fallback, should not happen
  };
  
  const AverageTipCard = () => <Card className="mb-4 w-full">
      <CardContent className="p-4">
        {averageTipPerHour > 0 ? <div className="flex justify-between items-center bg-gradient-to-r from-[#9b87f5]/10 to-[#7E69AB]/5 border-[#9b87f5]/20 rounded-md p-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-[#9b87f5]" />
              <div>
                <h3 className="text-sm font-medium">Gemiddelde fooi per uur</h3>
                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground">Gemiddelde over alle periodes (incl. uitbetaald)</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Gemiddelde berekend over alle periodes (inclusief uitbetaalde periodes)</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </div>
            <span className="font-bold text-[#9b87f5]">€{averageTipPerHour.toFixed(2)} / uur</span>
          </div> : <div className="text-center py-2 text-muted-foreground">
            <p>{getEmptyStateMessage()}</p>
          </div>}
      </CardContent>
    </Card>;
  
  const handleRetryLoading = () => {
    setIsLoading(true);
    refreshTeamData()
      .then(() => {
        setHasError(false);
        setErrorMessage(null);
      })
      .catch(error => {
        console.error("Error retrying data load:", error);
        setHasError(true);
        setErrorMessage("Er is een fout opgetreden bij het opnieuw laden van de gegevens.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#9b87f5]"></div>
      </div>
    );
  }
  
  const effectiveTeamId = localTeamId || teamId;
  
  if (hasError) {
    return (
      <div className="space-y-6">
        <Card className="border-destructive/50">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div>
                <h3 className="text-lg font-medium">Fout bij laden</h3>
                <p className="text-muted-foreground mt-1">{errorMessage || "Er is een fout opgetreden bij het laden van de analysegegevens."}</p>
              </div>
              <Button onClick={handleRetryLoading}>
                Opnieuw proberen
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!effectiveTeamId) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-300">
          <CardContent className="p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertTriangle className="h-10 w-10 text-amber-500" />
              <div>
                <h3 className="text-lg font-medium">Geen team gevonden</h3>
                <p className="text-muted-foreground mt-1">Je moet eerst een team aanmaken of lid worden van een team voordat je analyses kunt bekijken.</p>
              </div>
              <Button onClick={() => navigate('/management')}>
                Naar Teambeheer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const hasAnyPeriodWithTips = periodData.some(period => period.total > 0);
  
  return <div className="space-y-4 w-full max-w-full px-1 sm:px-4">
      <h1 className="text-xl font-bold">Analyse</h1>
      
      <AverageTipCard />
      
      <TipChart />
      
      <Card className="w-full">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Verloop van fooi per uur</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Deze grafiek toont het verloop van de gemiddelde fooi per uur over verschillende periodes, inclusief uitbetaalde periodes.
            {lineChartData.length < periodData.filter(period => period.total > 0).length && ` (Laatste ${lineChartData.length} periodes weergegeven)`}
          </p>
          {hasAnyPeriodWithTips ? (
            <div className="h-[300px] sm:h-[350px] md:h-[400px] w-full">
              <ChartContainer config={chartConfig} className="h-full w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={lineChartData} 
                    margin={{
                      top: 10,
                      right: isMobile ? 5 : 20,
                      left: isMobile ? 5 : 20,
                      bottom: isMobile ? 70 : 40
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tickMargin={5} 
                      height={60} 
                      tick={{
                        fontSize: isMobile ? 8 : 10
                      }} 
                      interval={0} 
                      angle={-45} 
                      textAnchor="end" 
                    />
                    <YAxis 
                      width={isMobile ? 30 : 40} 
                      tick={{
                        fontSize: isMobile ? 10 : 12
                      }} 
                    />
                    <ChartTooltip 
                      content={({active, payload}) => {
                        if (active && payload && payload.length) {
                          return <ChartTooltipContent formatter={(value: number) => [`€${value.toFixed(2)}`, 'Gem. fooi per uur']} />;
                        }
                        return null;
                      }} 
                    />
                    <Legend 
                      wrapperStyle={{
                        fontSize: isMobile ? '10px' : '12px',
                        marginTop: isMobile ? '10px' : '5px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="average" 
                      name="Gem. fooi per uur" 
                      stroke="#33C3F0" 
                      strokeWidth={2} 
                      dot={{
                        r: isMobile ? 3 : 5
                      }} 
                      activeDot={{
                        r: isMobile ? 5 : 8
                      }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground h-[300px] sm:h-[350px] md:h-[400px] flex items-center justify-center">
              <p>Er zijn nog geen periodes met fooi gegevens.</p>
              <p className="mt-1">Voeg fooi toe aan een periode om deze grafiek te zien.</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="w-full mb-6">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-lg">Gemiddeld fooi per uur</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-muted-foreground mb-2 text-sm">
            Het gemiddelde fooi per uur wordt berekend op basis van de totale fooi en de gewerkte uren van het team.
            <span className="font-medium ml-1">Inclusief uitbetaalde periodes.</span>
          </p>
          {hasAnyPeriodWithTips ? (
            <ScrollArea className="h-64 w-full">
              <div className="space-y-2 pr-2">
                {periodData.filter(period => period.average > 0 || period.total > 0).reverse().map(period => (
                  <div key={period.id} className="flex justify-between p-2 border rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{period.name}</span>
                      {period.isPaid && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                          Uitbetaald
                        </span>
                      )}
                      {period.isHistorical && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                          Historisch
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-sm">
                      €{period.average.toFixed(2)}/uur
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <p>Er zijn nog geen periodes met fooi gegevens.</p>
              <p className="mt-1">Voeg fooi toe aan een periode om deze lijst te zien.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>;
};

export default Analytics;
