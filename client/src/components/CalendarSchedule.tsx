import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, addDays, startOfDay, isSameDay, isBefore } from "date-fns";

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

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const generateTimeSlots = () => {
    const now = new Date();
    const isSelectedDateToday = selectedDate && isSameDay(selectedDate, now);

    if (isSelectedDateToday) {
      // Only show FUTURE hours — exclude the current hour and everything before
      const currentHour = now.getHours();
      const remainingHours = 23 - currentHour; // starts at currentHour + 1
      return Array.from({ length: remainingHours }, (_, i) => {
        const hour = currentHour + 1 + i;
        return {
          value: hour,
          label: hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
          display: hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
        };
      });
    } else {
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i;
        return {
          value: hour,
          label: hour === 0 ? "12 AM" : hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`,
          display: hour === 0 ? "12:00 AM" : hour === 12 ? "12:00 PM" : hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`
        };
      });
    }
  };

  const timeSlots = generateTimeSlots();

  const quarterSlots = [
    { value: 0, label: ":00", minutes: 0 },
    { value: 15, label: ":15", minutes: 15 },
    { value: 30, label: ":30", minutes: 30 },
    { value: 45, label: ":45", minutes: 45 }
  ];

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    if (selectedDateTime) {
      const newDateTime = new Date(date);
      newDateTime.setHours(selectedDateTime.getHours(), selectedDateTime.getMinutes());
      onDateTimeChange(newDateTime);
    }
  };

  const handleTimeSelect = (hour: number) => {
    if (!selectedDate) return;

    const now = new Date();
    const isToday = isSameDay(selectedDate, now);
    let initialMinutes = 0;

    if (isToday && hour === now.getHours()) {
      const currentMinutes = now.getMinutes();
      if (currentMinutes < 15) initialMinutes = 15;
      else if (currentMinutes < 30) initialMinutes = 30;
      else if (currentMinutes < 45) initialMinutes = 45;
      else {
        hour = hour + 1;
        if (hour >= 24) return;
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

  const isDateSelected = (date: Date) => selectedDate && isSameDay(date, selectedDate);

  const isTimeSelected = (hour: number) =>
    selectedDateTime &&
    selectedDate &&
    isSameDay(selectedDateTime, selectedDate) &&
    selectedDateTime.getHours() === hour;

  const isQuarterSelected = (minutes: number) =>
    selectedDateTime &&
    selectedDate &&
    isSameDay(selectedDateTime, selectedDate) &&
    selectedDateTime.getMinutes() === minutes &&
    quarterState.hour !== null;

  const isTimeInPast = (hour: number, minutes: number = 0) => {
    if (!selectedDate) return false;
    const now = new Date();
    const timeSlot = new Date(selectedDate);
    timeSlot.setHours(hour, minutes, 0, 0);
    return timeSlot < now;
  };

  return (
    <div className="space-y-3">
      {/* Date Buttons */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <p className="text-xs text-muted-foreground mb-2">Choose a day within the next week</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {weekDays.map((date, index) => {
              const dayName = format(date, 'EEE');
              const dayNumber = format(date, 'd');
              const isToday = isSameDay(date, today);
              const isSelected = isDateSelected(date);

              return (
                <div key={index} className="text-center flex-shrink-0 min-w-[64px]">
                  <div className="text-xs font-medium text-muted-foreground mb-1">{dayName}</div>
                  <button
                    type="button"
                    onClick={() => !isBefore(date, startOfDay(today)) && handleDateSelect(date)}
                    disabled={isBefore(date, startOfDay(today))}
                    className={cn(
                      "w-full h-14 flex flex-col items-center justify-center gap-0 p-1 shadow-sm rounded-xl transition-all bg-[#FDF3E3] text-[#111827] hover:bg-[#C9A063] hover:text-[#111827]",
                      isSelected && "bg-[#C53B3B] text-white hover:bg-[#a83030] hover:text-white",
                      isBefore(date, startOfDay(today)) && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="font-bold text-xl leading-none">{dayNumber}</span>
                    {isToday && (
                      <span className="text-xs leading-tight font-medium mt-0.5">Today</span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Hour Buttons */}
      {selectedDate && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {timeSlots.map((slot) => {
                const isSelected = isTimeSelected(slot.value);
                const isPastTime = isTimeInPast(slot.value);

                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => !isPastTime && handleTimeSelect(slot.value)}
                    disabled={isPastTime}
                    className={cn(
                      "h-12 min-w-[90px] rounded-full shadow-sm text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all",
                      !isSelected && "bg-[#FDF3E3] text-[#111827] hover:bg-[#C9A063] hover:text-[#111827]",
                      isSelected && "bg-[#C53B3B] text-white hover:bg-[#a83030] hover:text-white",
                      isPastTime && "opacity-40 bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {slot.display}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Minute Buttons */}
      {selectedDate && quarterState.hour !== null && (
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {quarterSlots.map((slot) => {
                const isSelected = isQuarterSelected(slot.value);
                const isPastQuarterTime = quarterState.hour !== null && isTimeInPast(quarterState.hour, slot.value);

                return (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => !isPastQuarterTime && handleQuarterSelect(slot.value)}
                    disabled={isPastQuarterTime}
                    className={cn(
                      "h-12 min-w-[90px] rounded-full shadow-sm text-sm font-bold whitespace-nowrap flex-shrink-0 transition-all",
                      !isSelected && "bg-[#FDF3E3] text-[#111827] hover:bg-[#C9A063] hover:text-[#111827]",
                      isSelected && "bg-[#C53B3B] text-white hover:bg-[#a83030] hover:text-white",
                      isPastQuarterTime && "opacity-40 bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
