
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { supabase } from "@/integrations/supabase/client";
import type { TeamMemberPermissions } from "@/integrations/supabase/client";

interface PayoutSummaryProps {
  onClose: () => void;
}

const PayoutSummary = ({ onClose }: PayoutSummaryProps) => {
  const { payouts, periods, teamMembers } = useApp();
  const [latestPayout, setLatestPayout] = useState<any>(null);
  const [canManagePayouts, setCanManagePayouts] = useState(false);

  useEffect(() => {
    if (payouts.length > 0) {
      // Find the most recent payout
      const sortedPayouts = [...payouts].sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setLatestPayout(sortedPayouts[0]);
    }

    // Check if the user has permission to manage payouts
    const checkPermissions = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data: teamMemberships } = await supabase
          .from('team_members')
          .select('permissions, role')
          .eq('user_id', user.id)
          .single();
        
        if (teamMemberships) {
          // Type safe conversion with fallback
          const permissions = teamMemberships.permissions as TeamMemberPermissions || {
            add_tips: false,
            add_hours: false,
            view_team: false,
            view_reports: false,
            edit_tips: false,
            close_periods: false,
            manage_payouts: false
          };
          
          // Admin always has permission, otherwise check manage_payouts permission
          const isAdmin = teamMemberships.role === 'admin';
          const canManagePayouts = permissions.manage_payouts === true;
          
          setCanManagePayouts(isAdmin || canManagePayouts);
        }
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };
    
    checkPermissions();
  }, [payouts]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'd MMMM yyyy', { locale: nl });
  };

  // Find period names for the latest payout
  const getPeriodNames = () => {
    if (!latestPayout) return '';
    
    return latestPayout.periodIds.map((periodId: string) => {
      const period = periods.find(p => p.id === periodId);
      return period ? (period.name || `Periode ${formatDate(period.startDate)}`) : 'Onbekende periode';
    }).join(', ');
  };

  // Calculate total tips from the covered periods
  const getTotalTips = () => {
    if (!latestPayout) return 0;
    
    return latestPayout.periodIds.reduce((sum: number, periodId: string) => {
      const period = periods.find(p => p.id === periodId);
      if (period) {
        return sum + period.tips.reduce((s: number, tip: any) => s + tip.amount, 0);
      }
      return sum;
    }, 0);
  };

  if (!latestPayout) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Uitbetaling Overzicht</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Geen recente uitbetalingen gevonden.</p>
          <Button onClick={onClose} className="mt-4">Terug</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Uitbetaling Overzicht</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">Uitbetaald op {formatDate(latestPayout.date)}</p>
          <p className="text-sm text-muted-foreground">Perioden: {getPeriodNames()}</p>
          <p className="text-sm font-medium mt-2">Totaal fooien: €{getTotalTips().toFixed(2)}</p>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-medium">Verdeling</h3>
          <div className="border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Naam</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Bedrag</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {latestPayout.distribution.map((item: any) => {
                  const member = teamMembers.find(m => m.id === item.memberId);
                  return (
                    <tr key={item.memberId}>
                      <td className="px-4 py-2 whitespace-nowrap">{member ? member.name : 'Onbekend lid'}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-right font-medium">€{item.amount.toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-muted/20">
                  <td className="px-4 py-2 whitespace-nowrap font-bold">Totaal</td>
                  <td className="px-4 py-2 whitespace-nowrap text-right font-bold">
                    €{latestPayout.distribution.reduce((sum: number, item: any) => sum + item.amount, 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-6 flex justify-between">
          <Button onClick={onClose} variant="outline">Terug</Button>
          {canManagePayouts && (
            <Button variant="default">Exporteren</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PayoutSummary;
