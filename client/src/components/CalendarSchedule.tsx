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

  // Full 24-hour time slots in AM/PM format
  const timeSlots = Array.from({ length: 24 }, (_, i) => {
    const hour = i;
    return {
      value: hour,
      label: hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
      display: hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
    };
  });

  // Quarter-hour options (15-minute intervals)
  const quarterSlots = [
    { value: 0, label: "On the hour", minutes: 0 },
    { value: 15, label: "Quarter past", minutes: 15 },
    { value: 30, label: "Half past", minutes: 30 },
    { value: 45, label: "Quarter to", minutes: 45 }
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

    setQuarterState({ hour, minutes: 0 });
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(hour, 0, 0, 0);
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
                    key={index}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleDateSelect(date)}
                    disabled={isPast}
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

                return (
                  <Button
                    key={slot.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleTimeSelect(slot.value)}
                    className={cn(
                      "h-10 text-sm whitespace-nowrap flex-shrink-0 min-w-[80px]",
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

      {/* Quarter Hour Selection */}
      {selectedDate && quarterState.hour !== null && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Minutes (Optional)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Fine-tune your reminder time
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {quarterSlots.map((slot) => {
                const isSelected = isQuarterSelected(slot.value);

                return (
                  <Button
                    key={slot.value}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleQuarterSelect(slot.value)}
                    className={cn(
                      "h-10 text-sm whitespace-nowrap flex-shrink-0 min-w-[100px]",
                      isSelected && "bg-primary text-primary-foreground"
                    )}
                  >
                    {slot.label}
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