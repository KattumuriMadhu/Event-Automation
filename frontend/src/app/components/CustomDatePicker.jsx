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

    // Parse initial date or default to today
    const initialDate = value ? new Date(value) : new Date();
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
        // Adjust for timezone offset to ensure YYYY-MM-DD string is correct
        const offset = selected.getTimezoneOffset();
        const correctDate = new Date(selected.getTime() - (offset * 60 * 1000));

        onChange({ target: { name: 'date', value: correctDate.toISOString().split('T')[0] } });
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
            const isSelected = value === currentDate.toISOString().split('T')[0];
            const isToday = new Date().toDateString() === currentDate.toDateString();

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
                    value={value ? new Date(value).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : ""}
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
