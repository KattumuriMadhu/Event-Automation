"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./CustomDatePicker.module.scss";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export default function CustomDatePicker({ value, onChange }) {
    const [show, setShow] = useState(false);
    const containerRef = useRef(null);

    // Helper to parse 'YYYY-MM-DD' exactly as a local date
    const parseLocal = (dateStr) => {
        if (!dateStr) return new Date();
        const parts = dateStr.split("T")[0].split("-");
        if (parts.length === 3) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
        return new Date(dateStr);
    };

    // Helper to format a local date to 'YYYY-MM-DD' strictly in local time
    const formatLocal = (dateObj) => {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    };

    // Parse initial date or default to today safely
    const initialDate = value ? parseLocal(value) : new Date();
    const [viewDate, setViewDate] = useState(initialDate);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setShow(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day) => {
        const selected = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        onChange({ target: { name: 'date', value: formatLocal(selected) } });
        setShow(false);
    };

    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className={styles.empty}></div>);
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(year, month, day);
            const currentDateStr = formatLocal(currentDate);
            const valueStr = value ? value.split('T')[0] : "";
            
            const isSelected = valueStr === currentDateStr;
            const isToday = formatLocal(new Date()) === currentDateStr;

            days.push(
                <button
                    key={day}
                    type="button"
                    className={`${styles.dayBtn} ${isSelected ? styles.selected : ''} ${isToday ? styles.today : ''}`}
                    onClick={() => handleDateClick(day)}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div className={styles.datePickerContainer} ref={containerRef}>
            {/* INPUT TRIGGER */}
            <div className={styles.inputWrapper} onClick={() => setShow(!show)}>
                <input
                    readOnly
                    value={value ? parseLocal(value).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
                    placeholder="Select Event Date"
                    className={`${styles.dateInput} ${!value ? styles.placeholder : ''}`}
                />
                <CalendarIcon size={18} className={styles.calendarIcon} />
            </div>

            {/* CALENDAR POPUP */}
            {show && (
                <div className={styles.calendarPopup}>
                    <div className={styles.header}>
                        <button type="button" className={styles.navBtn} onClick={handlePrevMonth}>
                            <ChevronLeft size={20} />
                        </button>
                        <span className={styles.currentMonth}>
                            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                        </span>
                        <button type="button" className={styles.navBtn} onClick={handleNextMonth}>
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <div className={styles.grid}>
                        {DAYS.map((d) => (
                            <div key={d} className={styles.dayName}>{d}</div>
                        ))}
                        {renderDays()}
                    </div>
                </div>
            )}
        </div>
    );
}
