"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateRange } from "react-day-picker";

// Fungsi helper untuk mendapatkan hari dalam sebulan
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

// Fungsi helper untuk mendapatkan hari pertama dalam sebulan (0 = Minggu, 1 = Senin, dst)
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

// Nama-nama bulan
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Nama-nama hari dalam seminggu
const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

interface CustomCalendarProps {
  selected?: DateRange;
  onSelect?: (range: DateRange | undefined) => void;
  className?: string;
  numberOfMonths?: number;
  defaultMonth?: Date;
  mode?: "single" | "range" | "multiple";
}

export function CustomCalendar({ selected, onSelect, className, numberOfMonths = 2, defaultMonth = new Date(), mode = "range" }: CustomCalendarProps) {
  // State untuk bulan dan tahun yang ditampilkan
  const [currentMonth, setCurrentMonth] = useState(defaultMonth.getMonth());
  const [currentYear, setCurrentYear] = useState(defaultMonth.getFullYear());

  // State untuk tanggal yang dipilih
  const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(selected);
  const [selectionMode, setSelectionMode] = useState<"start" | "end">("start");

  // Update state ketika prop selected berubah
  useEffect(() => {
    setSelectedRange(selected);
  }, [selected]);

  // Fungsi untuk navigasi bulan
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Fungsi untuk menangani klik pada tanggal
  const handleDateClick = (year: number, month: number, day: number) => {
    const clickedDate = new Date(year, month, day);

    if (mode === "range") {
      if (!selectedRange || selectionMode === "start") {
        // Mulai rentang baru
        setSelectedRange({ from: clickedDate, to: undefined });
        setSelectionMode("end");
      } else if (selectionMode === "end") {
        // Selesaikan rentang
        const newRange = {
          from: selectedRange.from,
          to: clickedDate,
        };

        // Pastikan rentang tanggal valid (from <= to)
        if (selectedRange.from && clickedDate < selectedRange.from) {
          newRange.from = clickedDate;
          newRange.to = selectedRange.from;
        }

        setSelectedRange(newRange);
        setSelectionMode("start");

        // Panggil callback onSelect
        if (onSelect) {
          onSelect(newRange);
        }
      }
    } else if (mode === "single") {
      const newRange = { from: clickedDate, to: clickedDate };
      setSelectedRange(newRange);

      // Panggil callback onSelect
      if (onSelect) {
        onSelect(newRange);
      }
    }
  };

  // Fungsi untuk memeriksa apakah tanggal berada dalam rentang yang dipilih
  const isDateInRange = (date: Date) => {
    if (!selectedRange || !selectedRange.from) return false;

    if (selectedRange.to) {
      // Jika rentang lengkap, periksa apakah tanggal berada di antara from dan to
      return date >= selectedRange.from && date <= selectedRange.to;
    } else {
      // Jika hanya from yang dipilih, periksa kesamaan tanggal
      return date.getDate() === selectedRange.from.getDate() && date.getMonth() === selectedRange.from.getMonth() && date.getFullYear() === selectedRange.from.getFullYear();
    }
  };

  // Fungsi untuk memeriksa apakah tanggal adalah awal atau akhir rentang
  const isDateRangeStart = (date: Date) => {
    if (!selectedRange || !selectedRange.from) return false;

    return date.getDate() === selectedRange.from.getDate() && date.getMonth() === selectedRange.from.getMonth() && date.getFullYear() === selectedRange.from.getFullYear();
  };

  const isDateRangeEnd = (date: Date) => {
    if (!selectedRange || !selectedRange.to) return false;

    return date.getDate() === selectedRange.to.getDate() && date.getMonth() === selectedRange.to.getMonth() && date.getFullYear() === selectedRange.to.getFullYear();
  };

  // Fungsi untuk memeriksa apakah tanggal adalah hari ini
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  // Render bulan
  const renderMonth = (monthOffset: number) => {
    let month = currentMonth + monthOffset;
    let year = currentYear;

    // Sesuaikan tahun jika bulan melebihi batas
    if (month > 11) {
      month = month - 12;
      year += 1;
    } else if (month < 0) {
      month = month + 12;
      year -= 1;
    }

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    // Dapatkan hari dari bulan sebelumnya untuk mengisi awal grid
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    const days = [];

    // Hari dari bulan sebelumnya
    for (let i = 0; i < firstDay; i++) {
      const day = daysInPrevMonth - firstDay + i + 1;
      const date = new Date(prevYear, prevMonth, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        isToday: isToday(date),
        isInRange: isDateInRange(date),
        isRangeStart: isDateRangeStart(date),
        isRangeEnd: isDateRangeEnd(date),
      });
    }

    // Hari dari bulan saat ini
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        day: i,
        isCurrentMonth: true,
        isToday: isToday(date),
        isInRange: isDateInRange(date),
        isRangeStart: isDateRangeStart(date),
        isRangeEnd: isDateRangeEnd(date),
      });
    }

    // Hari dari bulan berikutnya untuk mengisi sisa grid
    const remainingDays = 42 - days.length; // 6 baris x 7 kolom = 42 sel
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(nextYear, nextMonth, i);
      days.push({
        date,
        day: i,
        isCurrentMonth: false,
        isToday: isToday(date),
        isInRange: isDateInRange(date),
        isRangeStart: isDateRangeStart(date),
        isRangeEnd: isDateRangeEnd(date),
      });
    }

    // Bagi hari menjadi baris (minggu)
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="month-container">
        <div className="text-center font-medium py-2">
          {monthNames[month]} {year}
        </div>
        <div className="grid grid-cols-7 gap-0">
          {/* Header hari */}
          {dayNames.map((day, index) => (
            <div key={`header-${index}`} className="text-center text-xs text-muted-foreground font-medium py-1">
              {day}
            </div>
          ))}

          {/* Sel tanggal */}
          {days.map((day, index) => (
            <button
              key={`day-${index}`}
              onClick={() => day.isCurrentMonth && handleDateClick(year, month, day.day)}
              disabled={!day.isCurrentMonth}
              className={cn(
                "h-9 w-9 p-0 font-normal text-center flex items-center justify-center rounded-md",
                day.isCurrentMonth ? "text-foreground" : "text-muted-foreground opacity-50",
                day.isToday && "bg-accent text-accent-foreground",
                day.isInRange && "bg-accent text-accent-foreground",
                day.isRangeStart && "bg-primary text-primary-foreground",
                day.isRangeEnd && "bg-primary text-primary-foreground",
                !day.isCurrentMonth && "cursor-default"
              )}
            >
              {day.day}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("p-3 custom-calendar", className)}>
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent p-0" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Button>

        <Button variant="outline" size="icon" className="h-7 w-7 bg-transparent p-0" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0">
        {Array.from({ length: numberOfMonths }).map((_, i) => (
          <div key={i} className="space-y-4">
            {renderMonth(i)}
          </div>
        ))}
      </div>
    </div>
  );
}
