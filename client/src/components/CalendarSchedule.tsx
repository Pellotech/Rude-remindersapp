import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

interface CalendarScheduleProps {
  selectedDateTime: Date | null;
  onDateTimeChange: (dateTime: Date) => void;
}

export function CalendarSchedule({ selectedDateTime, onDateTimeChange }: CalendarScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(selectedDateTime);
  
  // Generate the 7 days of the week starting from today
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  
  // Time slots from 6 AM to 11 PM in 1-hour increments
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return {
      value: hour,
      label: hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
      display: hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
    };
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // If there's already a selected time, combine it with the new date
    if (selectedDateTime) {
      const newDateTime = new Date(date);
      newDateTime.setHours(selectedDateTime.getHours(), selectedDateTime.getMinutes());
      onDateTimeChange(newDateTime);
    }
  };

  const handleTimeSelect = (hour: number) => {
    if (!selectedDate) return;
    
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(hour, 0, 0, 0);
    onDateTimeChange(newDateTime);
  };

  const isDateSelected = (date: Date) => {
    return selectedDate && isSameDay(date, selectedDate);
  };

  const isTimeSelected = (hour: number) => {
    return selectedDateTime && 
           selectedDate && 
           isSameDay(selectedDateTime, selectedDate) && 
           selectedDateTime.getHours() === hour;
  };

  return (
    <div className="space-y-4">
      {/* Calendar Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Date</CardTitle>
          <p className="text-sm text-muted-foreground">Choose a day within the next week</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date, index) => {
              const dayName = format(date, 'EEE'); // Mon, Tue, Wed, etc.
              const dayNumber = format(date, 'd');
              const isToday = isSameDay(date, today);
              const isSelected = isDateSelected(date);
              
              return (
                <div key={index} className="text-center">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {dayName}
                  </div>
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDateSelect(date)}
                    className={cn(
                      "w-full h-12 flex flex-col items-center justify-center p-1",
                      isToday && !isSelected && "border-primary text-primary",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                  >
                    <span className="text-lg font-semibold">{dayNumber}</span>
                    {isToday && (
                      <span className="text-xs">Today</span>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Time Slots Section */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Time</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose a time for {format(selectedDate, 'EEEE, MMMM d')}
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {timeSlots.map((slot) => {
                const isSelected = isTimeSelected(slot.value);
                
                return (
                  <Button
                    key={slot.value}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeSelect(slot.value)}
                    className={cn(
                      "h-10 text-sm",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                  >
                    {slot.display}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected DateTime Display */}
      {selectedDateTime && (
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">Selected reminder time:</p>
          <p className="font-medium">
            {format(selectedDateTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}
          </p>
        </div>
      )}
    </div>
  );
}