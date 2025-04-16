import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, DollarSign, UsersRound, FileText } from 'lucide-react';
import { format, isSameMonth, isSameYear } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';

const MyOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { teamId, teamMembers, periods, payouts, refreshTeamData } = useApp();
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (!teamId) {
          console.error("No team ID available");
          setError("Geen team ID beschikbaar");
          setLoading(false);
          return;
        }
        
        await refreshTeamData();
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        setError(error.message || "Fout bij het ophalen van gegevens");
        setLoading(false);
      }
    };
    
    fetchData();
  }, [teamId, refreshTeamData]);
  
  const monthlyTips = periods.reduce((sum, period) => {
    const periodDate = new Date(period.startDate);
    if (isSameMonth(periodDate, currentMonth) && isSameYear(periodDate, currentMonth)) {
      return sum + period.tips.reduce((periodSum, tip) => periodSum + tip.amount, 0);
    }
    return sum;
  }, 0);
  
  const totalTeamMembers = teamMembers.length;
  const totalPeriods = periods.length;
  const totalPayouts = payouts.length;
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  if (loading) {
    return <Card><CardContent className="p-8 text-center">Gegevens laden...</CardContent></Card>;
  }
  
  if (error) {
    return <Card><CardContent className="p-8 text-center text-red-500">Fout: {error}</CardContent></Card>;
  }
  
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Fooi deze maand
          </CardTitle>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            className="h-4 w-4 text-muted-foreground"
          >
            <path d="M12 2v20M17 5h-5M17 19h-5" />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{monthlyTips.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            <button onClick={prevMonth}>Vorige</button> | {format(currentMonth, 'MMMM yyyy', { locale: nl })} | <button onClick={nextMonth}>Volgende</button>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Totaal teamleden
          </CardTitle>
          <UsersRound className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalTeamMembers}</div>
          <p className="text-xs text-muted-foreground">
            Alle actieve teamleden
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Totaal periodes
          </CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPeriods}</div>
          <p className="text-xs text-muted-foreground">
            Alle aangemaakte periodes
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Totaal uitbetalingen
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalPayouts}</div>
          <p className="text-xs text-muted-foreground">
            Alle geregistreerde uitbetalingen
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default MyOverview;
