import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, isSameDay, isBefore, isPast } from "date-fns";

interface CalendarScheduleProps {
  selectedDateTime: Date | null;
  onDateTimeChange: (dateTime: Date) => void;
}

interface QuarterState {
  hour: number | null;
  minutes: number;
}

export function CalendarSchedule({ selectedDateTime, onDateTimeChange }: CalendarScheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(selectedDateTime);
  const [quarterState, setQuarterState] = useState<QuarterState>({ hour: null, minutes: 0 });

  // Generate the 7 days of the week starting from today
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  // Generate time slots - show appropriate hours based on selected date
  const generateTimeSlots = () => {
    const now = new Date();
    const isSelectedDateToday = selectedDate && isSameDay(selectedDate, now);
    
    if (isSelectedDateToday) {
      // When today is selected: Show time slots starting from the current hour and continue through the rest of the day
      const currentHour = now.getHours();
      const remainingHours = 24 - currentHour;
      
      return Array.from({ length: remainingHours }, (_, i) => {
        const hour = currentHour + i;
        return {
          value: hour,
          label: hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
          display: hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
        };
      });
    } else {
      // For future dates: Show all 24 hours in natural order (12 AM - 11 PM)
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i; // 0 = 12 AM, 1 = 1 AM, ..., 23 = 11 PM
        return {
          value: hour,
          label: hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
          display: hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
        };
      });
    }
  };

  const timeSlots = generateTimeSlots();

  // Quarter-hour options (15-minute intervals)
  const quarterSlots = [
    { value: 0, label: ":00", displayLabel: "On the hour", minutes: 0 },
    { value: 15, label: ":15", displayLabel: "Quarter past", minutes: 15 },
    { value: 30, label: ":30", displayLabel: "Half past", minutes: 30 },
    { value: 45, label: ":45", displayLabel: "Quarter to", minutes: 45 }
  ];

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

    // If selecting today's date and this hour, check if we need to start with a future minute
    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    let initialMinutes = 0;
    
    if (isToday && hour === now.getHours()) {
      // If it's the current hour, start with the next available 15-minute slot
      const currentMinutes = now.getMinutes();
      if (currentMinutes < 15) initialMinutes = 15;
      else if (currentMinutes < 30) initialMinutes = 30;
      else if (currentMinutes < 45) initialMinutes = 45;
      else {
        // If past 45 minutes, move to next hour
        hour = hour + 1;
        if (hour >= 24) return; // Can't schedule for next day in this component
        initialMinutes = 0;
      }
    }

    setQuarterState({ hour, minutes: initialMinutes });
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(hour, initialMinutes, 0, 0);
    onDateTimeChange(newDateTime);
  };

  const handleQuarterSelect = (minutes: number) => {
    if (!selectedDate || quarterState.hour === null) return;

    setQuarterState({ ...quarterState, minutes });
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(quarterState.hour, minutes, 0, 0);
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

  const isQuarterSelected = (minutes: number) => {
    return selectedDateTime &&
           selectedDate &&
           isSameDay(selectedDateTime, selectedDate) &&
           selectedDateTime.getMinutes() === minutes &&
           quarterState.hour !== null;
  };

  const isTimeInPast = (hour: number, minutes: number = 0) => {
    if (!selectedDate) return false;

    const now = new Date();
    const timeSlot = new Date(selectedDate);
    timeSlot.setHours(hour, minutes, 0, 0);

    return timeSlot < now;
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
          <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {weekDays.map((date, index) => {
              const dayName = format(date, 'EEE'); // Mon, Tue, Wed, etc.
              const dayNumber = format(date, 'd');
              const isToday = isSameDay(date, today);
              const isSelected = isDateSelected(date);

              return (
                <div key={index} className="text-center flex-shrink-0 min-w-[70px]">
                  <div className="text-xs font-medium text-muted-foreground mb-1">
                    {dayName}
                  </div>
                  <Button
                    key={index}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDateSelect(date)}
                    disabled={isPast(date)}
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
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {timeSlots.map((slot) => {
                const isSelected = isTimeSelected(slot.value);
                const isPastTime = isTimeInPast(slot.value);

                return (
                  <Button
                    key={slot.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeSelect(slot.value)}
                    disabled={isPastTime}
                    className={cn(
                      "h-10 text-sm whitespace-nowrap flex-shrink-0 min-w-[80px]",
                      isSelected && "bg-primary text-primary-foreground",
                      isPastTime && "opacity-50 bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
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

      {/* Quarter Hour Selection */}
      {selectedDate && quarterState.hour !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Minutes</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose exact time for {quarterState.hour !== null ? timeSlots[quarterState.hour]?.label : ''} 
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {quarterSlots.map((slot) => {
                const isSelected = isQuarterSelected(slot.value);
                const isPastQuarterTime = quarterState.hour !== null && isTimeInPast(quarterState.hour, slot.value);

                return (
                  <Button
                    key={slot.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuarterSelect(slot.value)}
                    disabled={isPastQuarterTime}
                    className={cn(
                      "h-16 text-sm whitespace-nowrap flex-shrink-0 min-w-[100px]",
                      isSelected && "bg-primary text-primary-foreground",
                      isPastQuarterTime && "opacity-50 bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200"
                    )}
                  >
                    <div className="flex flex-col items-center">
                      <span className="font-semibold text-base">{slot.label}</span>
                      <span className="text-xs opacity-75">{slot.displayLabel}</span>
                    </div>
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