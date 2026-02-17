"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CustomDateTimePicker.module.scss";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// Helper to format Date object to "Mon, Oct 5 • 10:30 AM"
const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
};

export default function CustomDateTimePicker({ value, onChange }) {
    const [show, setShow] = useState(false);
    const containerRef = useRef(null);

    // Initialize state from props or default
    const initialDate = value ? new Date(value) : new Date();

    // Calendar View State
    const [viewDate, setViewDate] = useState(initialDate);

    // Selection State
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [hour, setHour] = useState(initialDate.getHours() % 12 || 12);
    const [minute, setMinute] = useState(initialDate.getMinutes());
    const [period, setPeriod] = useState(initialDate.getHours() >= 12 ? "PM" : "AM");

    // Sync state if external value changes (e.g. from AI)
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            setSelectedDate(d);
            setViewDate(d);
            setHour(d.getHours() % 12 || 12);
            setMinute(d.getMinutes());
            setPeriod(d.getHours() >= 12 ? "PM" : "AM");
        }
    }, [value]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShow(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    /* ================= HANDLERS ================= */
    const updateParent = (newDate, newHour, newMinute, newPeriod) => {
        // Convert 12h to 24h
        let h = newHour;
        if (newPeriod === "PM" && h !== 12) h += 12;
        if (newPeriod === "AM" && h === 12) h = 0;

        const finalDate = new Date(newDate);
        finalDate.setHours(h, newMinute, 0, 0);

        // Adjust for timezone offset so ISO string is correct for local time
        const offset = finalDate.getTimezoneOffset();
        const correctDate = new Date(finalDate.getTime() - (offset * 60 * 1000));

        // Return ISO string format: YYYY-MM-DDTHH:mm
        onChange({ target: { value: correctDate.toISOString().slice(0, 16) } });
    };

    const handleDateClick = (day) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        setSelectedDate(newDate);
        updateParent(newDate, hour, minute, period);
    };

    const handleTimeChange = (type, val) => {
        if (type === "hour") {
            setHour(val);
            updateParent(selectedDate, val, minute, period);
        }
        if (type === "minute") {
            setMinute(val);
            updateParent(selectedDate, hour, val, period);
        }
        if (type === "period") {
            setPeriod(val);
            updateParent(selectedDate, hour, minute, val);
        }
    };

    /* ================= RENDER HELPERS ================= */
    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.empty}></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const isSelected = selectedDate.toDateString() === currentDate.toDateString();
            const isToday = new Date().toDateString() === currentDate.toDateString();

            days.push(
                <button
                    key={day}
                    type="button"
                    className={`${styles.dayBtn} ${isSelected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
                    onClick={() => handleDateClick(day)}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    return (
        <div className={styles.container} ref={containerRef}>
            {/* INPUT TRIGGER */}
            <div className={styles.inputWrapper} onClick={() => setShow(!show)}>
                <input
                    readOnly
                    value={formatDateDisplay(value)}
                    placeholder="Select Date & Time"
                    className={`${styles.input} ${!value ? styles.placeholder : ''}`}
                />
                <CalendarIcon size={18} className={styles.icon} />
            </div>

            {/* POPUP */}
            {show && (
                <div className={styles.popup}>
                    {/* LEFT: CALENDAR */}
                    <div className={styles.calendarSection}>
                        <div className={styles.header}>
                            <button type="button" className={styles.navBtn} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>
                                <ChevronLeft size={20} />
                            </button>
                            <span className={styles.currentMonth}>
                                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                            </span>
                            <button type="button" className={styles.navBtn} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className={styles.grid}>
                            {DAYS.map((d) => <div key={d} className={styles.dayName}>{d}</div>)}
                            {renderDays()}
                        </div>
                    </div>

                    {/* RIGHT: TIME SELECTOR */}
                    <div className={styles.timeSection}>
                        <div className={styles.timeHeader}>Time</div>
                        <div className={styles.timeGrid}>
                            {/* HOURS */}
                            <div className={styles.column}>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
                                    <button
                                        key={h}
                                        type="button"
                                        className={`${styles.timeBtn} ${hour === h ? styles.activeTime : ''}`}
                                        onClick={() => handleTimeChange("hour", h)}
                                    >
                                        {h.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
                            {/* MINUTES (0-59) */}
                            <div className={styles.column}>
                                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`${styles.timeBtn} ${minute === m ? styles.activeTime : ''}`}
                                        onClick={() => handleTimeChange("minute", m)}
                                    >
                                        {m.toString().padStart(2, '0')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.periodToggle}>
                            <button
                                type="button"
                                className={`${styles.periodBtn} ${period === "AM" ? styles.activePeriod : ''}`}
                                onClick={() => handleTimeChange("period", "AM")}
                            >
                                AM
                            </button>
                            <button
                                type="button"
                                className={`${styles.periodBtn} ${period === "PM" ? styles.activePeriod : ''}`}
                                onClick={() => handleTimeChange("period", "PM")}
                            >
                                PM
                            </button>
                        </div>

                        <div className={styles.footer}>
                            <button type="button" className={styles.doneBtn} onClick={() => setShow(false)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
