
import React from 'react';
import { RefreshCw, WifiOff, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type StatusType = 'loading' | 'offline' | 'error' | 'success' | 'warning' | 'empty';

interface StatusIndicatorProps {
  type: StatusType;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  minimal?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  title,
  message,
  actionLabel,
  onAction,
  className,
  minimal = false
}) => {
  const getIcon = () => {
    switch (type) {
      case 'loading':
        return <Loader2 className={cn("animate-spin", minimal ? "h-4 w-4" : "h-6 w-6")} />;
      case 'offline':
        return <WifiOff className={cn(minimal ? "h-4 w-4" : "h-6 w-6", "text-red-500")} />;
      case 'error':
        return <AlertTriangle className={cn(minimal ? "h-4 w-4" : "h-6 w-6", "text-destructive")} />;
      case 'success':
        return <CheckCircle className={cn(minimal ? "h-4 w-4" : "h-6 w-6", "text-green-500")} />;
      case 'warning':
        return <AlertTriangle className={cn(minimal ? "h-4 w-4" : "h-6 w-6", "text-amber-500")} />;
      default:
        return null;
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case 'loading': return 'Gegevens laden...';
      case 'offline': return 'Je bent offline';
      case 'error': return 'Er is een fout opgetreden';
      case 'success': return 'Succesvol';
      case 'warning': return 'Let op';
      case 'empty': return 'Geen gegevens';
      default: return '';
    }
  };

  const getDefaultMessage = () => {
    switch (type) {
      case 'loading': return 'Even geduld, we laden je gegevens.';
      case 'offline': return 'Wijzigingen worden automatisch verwerkt wanneer je weer online bent.';
      case 'error': return 'Probeer het later opnieuw of ververs de pagina.';
      case 'empty': return 'Er zijn nog geen gegevens beschikbaar.';
      default: return '';
    }
  };

  const defaultActionLabel = type === 'offline' ? 'Verbind opnieuw' : 'Probeer opnieuw';

  // For minimal version (like in-line status indicators)
  if (minimal) {
    return (
      <div className={cn("flex items-center gap-1.5 text-sm", className)}>
        {getIcon()}
        <span>{title || getDefaultTitle()}</span>
        {onAction && (
          <Button 
            variant="link" 
            size="sm" 
            className="h-auto p-0" 
            onClick={onAction}
          >
            {actionLabel || defaultActionLabel}
          </Button>
        )}
      </div>
    );
  }

  // Full version for standalone status displays
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-4 text-center transition-opacity duration-300",
      {
        "bg-red-50 border border-red-200 rounded-md": type === 'offline' || type === 'error',
        "bg-amber-50 border border-amber-200 rounded-md": type === 'warning',
        "rounded-md": true
      },
      className
    )}>
      <div className="mb-2">{getIcon()}</div>
      <h3 className="font-medium text-lg">{title || getDefaultTitle()}</h3>
      <p className="text-muted-foreground mt-1">{message || getDefaultMessage()}</p>
      {onAction && (
        <Button 
          size="sm" 
          variant={type === 'offline' || type === 'error' ? "destructive" : "default"}
          className="mt-4" 
          onClick={onAction}
        >
          {actionLabel || defaultActionLabel}
        </Button>
      )}
    </div>
  );
};
