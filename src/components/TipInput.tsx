import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Euro, Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase, TeamMemberPermissions } from '@/integrations/supabase/client';

const presets = [5, 10, 20, 50, 100];

const TipInput = () => {
  const { addTip, currentPeriod, startNewPeriod } = useApp();
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [showNote, setShowNote] = useState<boolean>(false);
  const [date, setDate] = useState<Date>(new Date());
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [userPermissions, setUserPermissions] = useState<any>(null);
  const [canAddTips, setCanAddTips] = useState(true);
  const { toast } = useToast();
  
  const placeholders = [
    "bijvoorbeeld: Tafel 6",
    "bijvoorbeeld: Vrijdag 20/4",
    "bijvoorbeeld: Speciaal voor de cocktail"
  ];
  
  const [placeholder] = useState(
    placeholders[Math.floor(Math.random() * placeholders.length)]
  );

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setCanAddTips(false);
          return;
        }
        
        // Get team member record with permissions
        const { data: teamMember, error } = await supabase
          .from('team_members')
          .select('permissions, role')
          .eq('user_id', user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error checking permissions:', error);
          setCanAddTips(false);
          return;
        }
        
        // Admin role can do everything
        if (teamMember?.role === 'admin') {
          setCanAddTips(true);
          setUserPermissions(teamMember.permissions);
          return;
        }
        
        // Check add_tips permission - Fix the type checking here
        const permissions = teamMember?.permissions as unknown as Record<string, boolean>;
        if (permissions && typeof permissions === 'object' && !Array.isArray(permissions)) {
          setCanAddTips(permissions.add_tips === true);
        } else {
          setCanAddTips(false);
        }
        
        setUserPermissions(teamMember?.permissions);
      } catch (error) {
        console.error('Error checking permissions:', error);
        setCanAddTips(false);
      }
    };
    
    checkPermissions();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canAddTips) {
      toast({
        title: "Geen toegang",
        description: "Je hebt geen toestemming om fooi toe te voegen.",
        variant: "destructive"
      });
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }
    
    // Check if there's an active period, if not, create one first
    if (!currentPeriod) {
      // Start a new period
      startNewPeriod();
      // Then immediately add the tip to the new period
      // No need for setTimeout as startNewPeriod is synchronous
      addTip(parsedAmount, note.trim() || undefined, date.toISOString());
      resetForm();
    } else {
      // Normal flow when period exists
      addTip(parsedAmount, note.trim() || undefined, date.toISOString());
      resetForm();
    }
  };

  const resetForm = () => {
    setAmount('');
    setNote('');
    setShowNote(false);
    setDate(new Date());
    setShowDateWarning(false);
  };

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString());
  };

  const handleDateChange = (newDate: Date | undefined) => {
    if (!newDate) return;
    
    setDate(newDate);
    
    if (currentPeriod && !currentPeriod.isActive && currentPeriod.endDate) {
      const periodEnd = new Date(currentPeriod.endDate);
      const periodStart = new Date(currentPeriod.startDate);
      
      if (newDate > periodEnd || newDate < periodStart) {
        setShowDateWarning(true);
        toast({
          title: "Let op",
          description: "De geselecteerde datum valt buiten de huidige periode. Je kan de fooi nog steeds toevoegen.",
          variant: "default",
        });
      } else {
        setShowDateWarning(false);
      }
    }
  };

  if (!canAddTips) {
    return (
      <Card>
        <CardContent className="p-4">
          <h2 className="text-lg font-medium mb-4">Fooi toevoegen</h2>
          <div className="text-center py-4 text-muted-foreground">
            Je hebt geen toestemming om fooi toe te voegen.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="text-lg font-medium mb-4">Fooi toevoegen</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="flex items-center mb-4">
            <Euro size={20} className="mr-2 text-muted-foreground" />
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Bedrag"
              step="0.01"
              min="0"
              className="flex-1"
            />
          </div>
          
          <div className="flex space-x-2 mb-4 overflow-x-auto py-1">
            {presets.map((preset) => (
              <Button
                key={preset}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                €{preset}
              </Button>
            ))}
          </div>
          
          <div className="mb-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    showDateWarning && "border-amber-500 text-amber-600"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'd MMMM yyyy', { locale: nl }) : <span>Selecteer datum</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={handleDateChange}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={nl}
                />
              </PopoverContent>
            </Popover>
            {showDateWarning && (
              <p className="text-xs text-amber-600 mt-1">
                Deze datum valt buiten de huidige periode.
              </p>
            )}
          </div>
          
          {showNote ? (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={placeholder}
              className="mb-4 placeholder:italic"
              rows={2}
            />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 text-muted-foreground"
              onClick={() => setShowNote(true)}
            >
              + Notitie toevoegen
            </Button>
          )}
          
          <Button 
            type="submit" 
            variant="goldGradient" 
            className="w-full animate-pulse-subtle group relative overflow-hidden" 
            disabled={!amount || isNaN(parseFloat(amount))}
          >
            <Sparkles size={16} className="mr-1 text-amber-700 animate-pulse" />
            <span className="relative z-10">Top Tip</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default TipInput;
