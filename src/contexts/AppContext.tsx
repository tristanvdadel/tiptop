
  const calculateAutoCloseDate = (startDate: string): Date => {
    const date = new Date(startDate);
    
    switch (periodDuration) {
      case 'day':
        return addDays(date, 1);
      case 'week':
        return addDays(date, 7);
      case 'month':
        // Add one month to the start date
        const month = date.getMonth();
        const newDate = new Date(date);
        newDate.setMonth(month + 1);
        return newDate;
      default:
        return addDays(date, 30); // Default fallback
    }
  };
