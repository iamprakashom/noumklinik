import { useState, useMemo, useEffect, useRef } from "react";
import {
  type ClinicHoursSettings,
  DEFAULT_OPEN_TIME,
  DEFAULT_CLOSE_TIME,
  DEFAULT_WORKING_DAYS,
  type DayOfWeek,
  getDayOfWeek,
} from "@/lib/clinic-hours";
import { inputClass } from "@/components/clinic/bits";
import { Clock, AlertCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function TimePickerSelector({
  name,
  defaultValue,
  clinic,
  required,
  minDate,
}: {
  name: string;
  defaultValue?: string;
  clinic?: ClinicHoursSettings | null | undefined;
  required?: boolean;
  minDate?: Date;
}) {
  const formatTimeVal = (d: Date) => {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const formatDateVal = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const getPlus2MinTime = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 2);
    return formatTimeVal(d);
  };

  const defaultDateObj = defaultValue ? new Date(defaultValue) : new Date();

  const [selectedDate, setSelectedDate] = useState<string>(
    defaultValue || required ? formatDateVal(defaultDateObj) : "",
  );
  const [selectedTime, setSelectedTime] = useState<string>(
    defaultValue ? formatTimeVal(defaultDateObj) : required ? getPlus2MinTime() : "",
  );
  const [open, setOpen] = useState(false);

  const minDateStr = minDate ? formatDateVal(minDate) : formatDateVal(new Date());
  const now = new Date();

  const currentDateObj = selectedDate ? new Date(`${selectedDate}T12:00:00`) : new Date();

  const dayName = getDayOfWeek(currentDateObj);
  const workingDays = clinic?.working_days ?? DEFAULT_WORKING_DAYS;
  const isWorkingDay = workingDays.includes(dayName);

  const openTime = clinic?.open_time || DEFAULT_OPEN_TIME;
  const closeTime = clinic?.close_time || DEFAULT_CLOSE_TIME;

  const isToday =
    currentDateObj.getFullYear() === now.getFullYear() &&
    currentDateObj.getMonth() === now.getMonth() &&
    currentDateObj.getDate() === now.getDate();

  const currentHHMM = useMemo(() => formatTimeVal(now), [now]);

  // Parsing selected HH and MM
  const [selHH, selMM] = useMemo(() => {
    if (!selectedTime || !selectedTime.includes(":")) {
      const nowHHMM = formatTimeVal(new Date());
      const defaultHHMM = nowHHMM > openTime ? nowHHMM : openTime;
      const [h = "09", m = "00"] = defaultHHMM.split(":");
      return [h.padStart(2, "0"), m.padStart(2, "0")];
    }
    const [h = "09", m = "00"] = selectedTime.split(":");
    return [h.padStart(2, "0"), m.padStart(2, "0")];
  }, [selectedTime, openTime]);

  const [activeHH, setActiveHH] = useState<string>(selHH);

  useEffect(() => {
    setActiveHH(selHH);
  }, [selHH]);

  // Hours array constrained strictly to business hours [openTime..closeTime]
  const hours = useMemo(() => {
    const openH = parseInt(openTime.split(":")[0] || "9", 10);
    const closeH = parseInt(closeTime.split(":")[0] || "19", 10);
    const result: string[] = [];
    for (let i = openH; i <= closeH; i++) {
      result.push(String(i).padStart(2, "0"));
    }
    return result.length > 0
      ? result
      : Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  }, [openTime, closeTime]);

  // Minutes array (00 to 59, 1-min interval)
  const minutes = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
  }, []);

  // Hour disabled check: hour disabled if all minutes in that hour are invalid
  const isHourDisabled = (hh: string) => {
    if (!isWorkingDay) return true;
    const hourStart = `${hh}:00`;
    const hourEnd = `${hh}:59`;
    if (hourEnd < openTime || hourStart > closeTime) return true;
    if (isToday && hourEnd <= currentHHMM) return true;
    return false;
  };

  // Minute disabled check for active selected hour
  const isMinuteDisabled = (hh: string, mm: string) => {
    if (!isWorkingDay) return true;
    const timeStr = `${hh}:${mm}`;
    if (timeStr < openTime || timeStr > closeTime) return true;
    if (isToday && timeStr <= currentHHMM) return true;
    return false;
  };

  const handleSelectTime = (hh: string, mm: string) => {
    if (isMinuteDisabled(hh, mm)) return;
    const newTime = `${hh}:${mm}`;
    setSelectedTime(newTime);
    setOpen(false); // auto close on pick
  };

  const timeValidation = useMemo(() => {
    if (!selectedTime) return null;
    if (!isWorkingDay) return { valid: false, message: `Clinic is closed on ${dayName}s.` };
    if (selectedTime < openTime || selectedTime > closeTime) {
      return {
        valid: false,
        message: `Time must be between working hours (${openTime} – ${closeTime}).`,
      };
    }
    if (isToday && selectedTime <= currentHHMM) {
      return { valid: false, message: "Selected time has already passed." };
    }
    return { valid: true, message: "Valid working hour slot." };
  }, [selectedTime, isWorkingDay, dayName, openTime, closeTime, isToday, currentHHMM]);

  const combinedValue = selectedDate && selectedTime ? `${selectedDate}T${selectedTime}` : "";

  // Auto-scroll selected element to center of scroll container when popover opens
  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        // Center selected or first enabled hour
        const targetHourEl =
          (hourRef.current?.querySelector('[data-selected="true"]') as HTMLElement) ||
          (hourRef.current?.querySelector("button:not([disabled])") as HTMLElement);
        if (targetHourEl && hourRef.current) {
          const containerHeight = hourRef.current.clientHeight;
          const elementTop = targetHourEl.offsetTop;
          const elementHeight = targetHourEl.clientHeight;
          hourRef.current.scrollTop = elementTop - containerHeight / 2 + elementHeight / 2;
        }

        // Center selected or first enabled minute
        const targetMinuteEl =
          (minuteRef.current?.querySelector('[data-selected="true"]') as HTMLElement) ||
          (minuteRef.current?.querySelector("button:not([disabled])") as HTMLElement);
        if (targetMinuteEl && minuteRef.current) {
          const containerHeight = minuteRef.current.clientHeight;
          const elementTop = targetMinuteEl.offsetTop;
          const elementHeight = targetMinuteEl.clientHeight;
          minuteRef.current.scrollTop = elementTop - containerHeight / 2 + elementHeight / 2;
        }
      }, 50);
    }
  }, [open]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={combinedValue} required={required} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${name}-date`}
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Date
          </label>
          <input
            id={`${name}-date`}
            type="date"
            min={minDateStr}
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
            }}
            className={inputClass}
            required={required}
          />
        </div>

        <div>
          <label
            id={`${name}-time-label`}
            htmlFor={`${name}-time-trigger`}
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Time ({openTime} – {closeTime})
          </label>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                id={`${name}-time-trigger`}
                aria-labelledby={`${name}-time-label`}
                aria-label={`Select time, currently ${selectedTime || "none"}`}
                type="button"
                disabled={!isWorkingDay}
                className={`${inputClass} flex items-center justify-between text-left ${
                  timeValidation && !timeValidation.valid
                    ? "border-destructive focus:ring-destructive"
                    : ""
                } ${!isWorkingDay ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span>{selectedTime || "Select time"}</span>
                <ChevronDown className="size-4 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2" align="start">
              <div className="flex items-center justify-between border-b pb-1.5 mb-2 px-1 text-xs font-semibold text-muted-foreground">
                <span className="w-1/2 text-center">Hours</span>
                <span className="w-1/2 text-center">Minutes</span>
              </div>
              <div className="flex h-56 gap-1">
                {/* Hours column */}
                <div
                  ref={hourRef}
                  onWheel={(e) => {
                    e.stopPropagation();
                    e.currentTarget.scrollTop += e.deltaY;
                  }}
                  className="flex-1 overflow-y-auto px-1 space-y-1 touch-pan-y overscroll-contain select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {hours.map((hh) => {
                    const disabled = isHourDisabled(hh);
                    const isSelected = activeHH === hh;
                    return (
                      <button
                        key={hh}
                        type="button"
                        disabled={disabled}
                        data-selected={isSelected}
                        onClick={() => setActiveHH(hh)}
                        className={`w-full rounded px-2 py-1 text-xs font-mono transition-colors text-center cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : disabled
                              ? "opacity-30 cursor-not-allowed bg-muted/40 text-muted-foreground"
                              : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        {hh}
                      </button>
                    );
                  })}
                </div>

                <div className="w-[1px] bg-border" />

                {/* Minutes column */}
                <div
                  ref={minuteRef}
                  onWheel={(e) => {
                    e.stopPropagation();
                    e.currentTarget.scrollTop += e.deltaY;
                  }}
                  className="flex-1 overflow-y-auto px-1 space-y-1 touch-pan-y overscroll-contain select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {minutes.map((mm) => {
                    const disabled = isMinuteDisabled(activeHH, mm);
                    const isSelected = selectedTime === `${activeHH}:${mm}`;
                    return (
                      <button
                        key={mm}
                        type="button"
                        disabled={disabled}
                        data-selected={isSelected}
                        onClick={() => handleSelectTime(activeHH, mm)}
                        className={`w-full rounded px-2 py-1 text-xs font-mono transition-colors text-center ${
                          isSelected
                            ? "bg-primary text-primary-foreground font-semibold"
                            : disabled
                              ? "opacity-30 cursor-not-allowed bg-muted/40 text-muted-foreground"
                              : "hover:bg-secondary text-foreground"
                        }`}
                      >
                        {mm}
                      </button>
                    );
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Helper Status Bar */}
      {!isWorkingDay ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>The clinic is closed on {dayName}s. Please choose an open day.</span>
        </div>
      ) : timeValidation && !timeValidation.valid ? (
        <div className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="size-3.5 shrink-0" />
          <span>{timeValidation.message}</span>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-primary" />
            Working hours on {dayName}:{" "}
            <strong className="font-medium text-foreground">
              {openTime} – {closeTime}
            </strong>
          </span>
          {timeValidation?.valid ? (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="size-3.5" /> Slot available
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}
