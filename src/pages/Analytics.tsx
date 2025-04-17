
import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from "@/components/ui/skeleton"
import { useApp } from '@/contexts/AppContext';
import { useTeamId } from '@/hooks/useTeamId';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import PeriodList from '@/components/analytics/PeriodList';
import ErrorCard from '@/components/ErrorCard';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Analytics = () => {
  const { teamId } = useTeamId();
  const { periods, isLoading, error } = useApp();
  const [periodData, setPeriodData] = useState([]);

  useEffect(() => {
    if (periods && periods.length > 0) {
      const data = periods.map(period => ({
        name: period.name || `Periode ${period.startDate}`,
        total: period.tips.reduce((sum, tip) => sum + tip.amount, 0),
        average: period.averageTipPerHour || 0,
        id: period.id,
        isPaid: period.isPaid || false,
        timestamp: new Date(period.startDate).getTime(),
        isHistorical: new Date(period.startDate) < new Date(),
      }));
      setPeriodData(data);
    } else {
      setPeriodData([]);
    }
  }, [periods]);

  const chartData = useMemo(() => {
    if (!periodData || periodData.length === 0) {
      return null;
    }

    const sortedData = [...periodData].sort((a, b) => a.timestamp - b.timestamp);

    return {
      labels: sortedData.map(period => period.name),
      datasets: [
        {
          label: 'Gemiddelde fooi per uur',
          data: sortedData.map(period => period.average),
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
        },
      ],
    };
  }, [periodData]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Fooi per periode',
      },
    },
  };

  if (isLoading) {
    return <Card className="w-full mb-6">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-lg">
          <Skeleton className="h-6 w-64" />
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <Skeleton className="h-4 w-full mb-2" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between p-2 border rounded-md">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Overzicht van de fooi gegevens van het team.
        </p>
      </div>

      {teamId ? (
        <>
          {chartData && <Card className="w-full mb-6">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-lg">Fooi per periode</CardTitle>
            </CardHeader>
            <CardContent>
              <Bar options={chartOptions} data={chartData} />
            </CardContent>
          </Card>}

          <PeriodList periodData={periodData} />
        </>
      ) : (
        <Card className="w-full mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Geen team geselecteerd</h3>
              <p className="text-muted-foreground">Selecteer een team om de analytics te bekijken.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <ErrorCard error={error instanceof Error ? error.message : String(error)} />}
    </div>
  );
};

export default Analytics;
