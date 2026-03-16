"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { getUser, getToken } from "@/utils/auth";
import { API_BASE_URL } from "@/utils/config";
import CustomDatePicker from "@/app/components/CustomDatePicker";
import { LayoutDashboard, Clock, CheckCircle, XCircle, ArrowLeft, Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import toast from "react-hot-toast";
import styles from "./page.module.scss";



export default function AnalyticsPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(false);

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayEvents, setDayEvents] = useState([]);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const selectorsRef = useRef(null);
  const activeMonthRef = useRef(null);
  const activeYearRef = useRef(null);

  useEffect(() => {
    if (isMonthOpen && activeMonthRef.current) {
      const parent = activeMonthRef.current.parentElement;
      if (parent) {
        parent.scrollTop = activeMonthRef.current.offsetTop - (parent.clientHeight / 2) + (activeMonthRef.current.clientHeight / 2);
      }
    }
  }, [isMonthOpen]);

  useEffect(() => {
    if (isYearOpen && activeYearRef.current) {
      const parent = activeYearRef.current.parentElement;
      if (parent) {
        parent.scrollTop = activeYearRef.current.offsetTop - (parent.clientHeight / 2) + (activeYearRef.current.clientHeight / 2);
      }
    }
  }, [isYearOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectorsRef.current && !selectorsRef.current.contains(e.target)) {
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }

      // Close export menu if clicked outside
      if (!e.target.closest(`.${styles.exportContainer}`)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const token = getToken();
    const currentUser = getUser();

    if (!token || !currentUser || currentUser.role !== "ADMIN") {
      router.push("/login");
      return;
    }

    setUser(currentUser);

    // Initial fetch
    fetchEvents(token);
  }, [router]);

  const fetchEvents = async (token) => {
    setLoading(true);
    setServerError(false);
    try {
      const response = await fetch(`${API_BASE_URL}/api/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEvents(data);
      } else {
        setServerError(true);
      }
    } catch (error) {
      console.error("Failed to load events for analytics", error);
      setServerError(true);
    } finally {
      setLoading(false);
    }
  };

  // Update selected day's events when dates change
  useEffect(() => {
    const selectedDateString = selectedDate.toDateString();
    const filtered = events.filter((e) => {
       if (e.dates && e.dates.length > 0) {
           return e.dates.some(d => new Date(d).toDateString() === selectedDateString);
       }
       return new Date(e.date).toDateString() === selectedDateString;
    });
    setDayEvents(filtered);
  }, [selectedDate, events]);

  if (loading) {
    return <div className={styles.loaderArea}>Loading Dashboard Analytics...</div>;
  }

  if (serverError) {
    return (
      <div className={styles.page}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: "center", padding: "50px" }}>
          <h2>Cannot Connect to Server</h2>
          <p style={{ marginTop: '10px', color: '#64748b' }}>Please check if the backend server is running and try again.</p>
          <button
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '500'
            }}
            onClick={() => window.location.reload()}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Basic Stats
  const totalCount = events.length;

  const getFilteredEvents = () => {
    // Validate date range first
    if (startDate && endDate) {
      const sDate = new Date(startDate);
      const enDate = new Date(endDate);
      sDate.setHours(0, 0, 0, 0);
      enDate.setHours(0, 0, 0, 0);

      if (enDate < sDate) {
        toast.error("End date must be greater than or equal to start date!");
        return;
      }
    }

    // Filter events by selected date range
    const filteredEvents = events.filter(e => {
      // Check if ANY of the dates fall in range
      const datesToCheck = e.dates && e.dates.length > 0 ? e.dates : [e.date];
      
      return datesToCheck.some(d => {
          const eDate = new Date(d);
          eDate.setHours(0, 0, 0, 0);

          if (startDate) {
            const sDate = new Date(startDate);
            sDate.setHours(0, 0, 0, 0);
            if (eDate < sDate) return false;
          }
          if (endDate) {
            const enDate = new Date(endDate);
            enDate.setHours(0, 0, 0, 0);
            if (eDate > enDate) return false;
          }
          return true;
      });
    });

    return filteredEvents;
  };

  const handleExport = (format) => {
    setIsExportMenuOpen(false);
    const filteredEvents = getFilteredEvents();

    // Explicit undefined check because getFilteredEvents handles the error toast
    if (!filteredEvents) return;

    if (filteredEvents.length === 0) {
      toast.error("No events recorded in that range.");
      return;
    }

    const headers = ["Event Title", "Date", "Department", "Audience Type", "Event Type", "Status", "Social Media Posted"];
    const rows = filteredEvents.map(e => {
      const isPosted = e.socialMedia?.instagram?.posted || e.socialMedia?.facebook?.posted;
      return [
        e.title || '',
        e.dates && e.dates.length > 0 ? e.dates.map(d => new Date(d).toLocaleDateString()).join(", ") : new Date(e.date).toLocaleDateString(),
        e.department || '',
        e.audience || '',
        e.type || '',
        e.approvalStatus || '',
        isPosted ? 'Yes' : 'No'
      ];
    });

    const fileName = "Event Report";

    if (format === 'excel') {
      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Events");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    } else if (format === 'pdf') {
      const doc = new jsPDF("landscape");

      doc.setFontSize(18);
      doc.text("Events Analytics Report", 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

      let dateString = "All time";
      if (startDate || endDate) {
        dateString = `${startDate || 'Start'} to ${endDate || 'Present'}`;
      }
      doc.text(`Date Range: ${dateString}`, 14, 36);

      autoTable(doc, {
        startY: 45,
        head: [headers],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [139, 92, 246] },
        styles: { fontSize: 9 }
      });

      doc.save(`${fileName}.pdf`);
    }
  };

  // Monthly Trend Data Preparration
  const monthsDataMap = {};
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Initialize last 6 months to 0
  const today = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(today.getFullYear(), today.getMonth() - i, 1);
    monthsDataMap[`${monthNames[m.getMonth()]} ${m.getFullYear()}`] = 0;
  }

  events.forEach((e) => {
    // For trends we just use the first date or primary date so we don't skew the total count with multi-day events
    const eDate = new Date(e.date);
    const mKey = `${monthNames[eDate.getMonth()]} ${eDate.getFullYear()}`;
    if (monthsDataMap[mKey] !== undefined) {
      monthsDataMap[mKey] += 1;
    }
  });

  const trendData = Object.keys(monthsDataMap).map((key) => ({
    name: key,
    events: monthsDataMap[key],
  }));

  const departmentDataMap = {};
  events.forEach((e) => {
    const dept = e.department || "Other";
    departmentDataMap[dept] = (departmentDataMap[dept] || 0) + 1;
  });
  const departmentData = Object.keys(departmentDataMap).map((key) => ({
    name: key,
    count: departmentDataMap[key],
  }));

  // Calendar Logic
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = (e) => {
    e.preventDefault();
    if (e.currentTarget) e.currentTarget.blur();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = (e) => {
    e.preventDefault();
    if (e.currentTarget) e.currentTarget.blur();
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleMonthChange = (e, monthIndex) => {
    e.stopPropagation();
    setCurrentDate(new Date(currentDate.getFullYear(), monthIndex, 1));
    setIsMonthOpen(false);
  };

  const handleYearChange = (e, year) => {
    e.stopPropagation();
    setCurrentDate(new Date(year, currentDate.getMonth(), 1));
    setIsYearOpen(false);
  };

  const hasEventOnDate = (day) => {
    return events.some((e) => {
      const datesToCheck = e.dates && e.dates.length > 0 ? e.dates : [e.date];
      return datesToCheck.some(d => {
          const eDate = new Date(d);
          return (
            eDate.getDate() === day &&
            eDate.getMonth() === currentDate.getMonth() &&
            eDate.getFullYear() === currentDate.getFullYear()
          );
      });
    });
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => router.push("/events")}>
            <ArrowLeft size={20} /> Back to Events
          </button>
          <h1>Dashboard Analytics</h1>
        </div>
      </header>

      <div className={styles.dashboardContainer}>
        <div className={styles.welcomeSection}>
          <h2>Welcome back, Coordinator Admin</h2>
          <p>Gain deeper insights into system activity and track upcoming events seamlessly.</p>
        </div>

        {/* TOP STATS & EXPORT */}
        <div className={styles.topActionsRow}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={styles.analyticsCard} style={{ "--card-color": "#2563eb", "--icon-bg": "rgba(37, 99, 235, 0.1)" }}>
            <div className={styles.iconWrapper}><LayoutDashboard size={28} /></div>
            <div className={styles.cardInfo}>
              <h3>Total Events</h3>
              <p className={styles.count}>{totalCount}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={styles.exportCard}>
            <h3>Export Event Report (Excel/CSV)</h3>
            <div className={styles.exportControls}>
              <div className={styles.dateInputGroup}>
                <label>Start Date:</label>
                <div className={styles.customDateWrapper}>
                  <CustomDatePicker
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.dateInputGroup}>
                <label>End Date:</label>
                <div className={styles.customDateWrapper}>
                  <CustomDatePicker
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={styles.exportContainer}>
                <button
                  className={styles.exportBtn}
                  onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                >
                  <Download size={18} />
                  Download Report
                  <ChevronDown size={14} className={styles.chevronIcon} />
                </button>

                <AnimatePresence>
                  {isExportMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={styles.exportDropdown}
                    >
                      <button onClick={() => handleExport("pdf")} className={styles.exportOption}>
                        As PDF Document (.pdf)
                      </button>
                      <button onClick={() => handleExport("excel")} className={styles.exportOption}>
                        As Excel Spreadsheet (.xlsx)
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <p className={styles.exportHint}>Leave dates empty to download all events.</p>
          </motion.div>
        </div>

        {/* CHARTS ROW */}
        <div className={styles.chartsRow}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }} className={styles.chartPanel}>
            <h3>Events by Department</h3>
            <div className={styles.chartWrapper}>
              {departmentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip wrapperStyle={{ borderRadius: '8px', overflow: 'hidden' }} contentStyle={{ border: 'none', background: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className={styles.emptyChartState}>
                  <p>No department data available for this period.</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className={styles.chartPanel}>
            <h3>Event Trends (Last 6 Months)</h3>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip wrapperStyle={{ borderRadius: '8px', overflow: 'hidden' }} contentStyle={{ border: 'none', background: '#fff', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="events" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorEvents)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* CALENDAR ROW */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className={styles.calendarSection}>
          <div className={styles.calendarCard}>
            <div className={styles.calendarHeader}>
              <button type="button" onClick={prevMonth} className={styles.calNav}><ChevronLeft size={20} /></button>
              <div className={styles.calSelectors} ref={selectorsRef}>
                <div className={styles.selectWrapper}>
                  <button
                    type="button"
                    className={styles.customSelectBtn}
                    onClick={() => { setIsMonthOpen(!isMonthOpen); setIsYearOpen(false); }}
                  >
                    {monthNames[currentDate.getMonth()]}
                    <ChevronDown size={16} />
                  </button>
                  {isMonthOpen && (
                    <div className={styles.customDropdown}>
                      {monthNames.map((month, index) => (
                        <div
                          key={month}
                          className={`${styles.customOption} ${currentDate.getMonth() === index ? styles.activeOption : ""}`}
                          onClick={(e) => handleMonthChange(e, index)}
                          ref={currentDate.getMonth() === index ? activeMonthRef : null}
                        >
                          {month}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.selectWrapper}>
                  <button
                    type="button"
                    className={styles.customSelectBtn}
                    onClick={() => { setIsYearOpen(!isYearOpen); setIsMonthOpen(false); }}
                  >
                    {currentDate.getFullYear()}
                    <ChevronDown size={16} />
                  </button>
                  {isYearOpen && (
                    <div className={styles.customDropdown}>
                      {Array.from({ length: 2050 - 2000 + 1 }).map((_, i) => {
                        const year = 2000 + i;
                        return (
                          <div
                            key={year}
                            className={`${styles.customOption} ${currentDate.getFullYear() === year ? styles.activeOption : ""}`}
                            onClick={(e) => handleYearChange(e, year)}
                            ref={currentDate.getFullYear() === year ? activeYearRef : null}
                          >
                            {year}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" onClick={nextMonth} className={styles.calNav}><ChevronRight size={20} /></button>
            </div>

            <div className={styles.calendarGrid}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className={styles.calDayName}>{day}</div>
              ))}
              {Array.from({ length: 42 }).map((_, i) => {
                const dayOffset = i - firstDayOfMonth + 1;
                const isCurrentMonthDay = dayOffset > 0 && dayOffset <= daysInMonth;

                if (!isCurrentMonthDay) {
                  return <div key={`empty-${i}`} className={styles.calEmpty} />;
                }

                const day = dayOffset;
                const isSelected = selectedDate.getDate() === day && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
                const hasEvent = hasEventOnDate(day);

                return (
                  <button
                    type="button"
                    key={`day-${day}`}
                    className={`${styles.calDay} ${isSelected ? styles.selectedDay : ""} ${hasEvent && !isSelected ? styles.hasEventDay : ""}`}
                    onClick={(e) => {
                      if (e.currentTarget) e.currentTarget.blur();
                      setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day));
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.dayEventsCard}>
            <h3>
              <CalendarIcon size={18} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#8b5cf6' }} />
              Events on {selectedDate.toLocaleDateString("default", { month: "short", day: "numeric", year: "numeric" })}
            </h3>

            <div className={styles.eventsList}>
              {dayEvents.length > 0 ? (
                dayEvents.map((evt) => (
                  <motion.div
                    key={evt._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={styles.eventListItem}
                  >
                    <div className={styles.evtType}>{evt.type} • {evt.department}</div>
                    <h4>{evt.title}</h4>
                    <p className={styles.evtAudience}>Audience: {evt.audience}</p>
                    <span className={`${styles.evtStatus} ${styles['status' + (evt.socialMedia?.instagram?.posted || evt.socialMedia?.facebook?.posted ? 'PUBLISHED' : evt.approvalStatus)]}`}>
                      {evt.socialMedia?.instagram?.posted || evt.socialMedia?.facebook?.posted ? "PUBLISHED" : evt.approvalStatus}
                    </span>
                  </motion.div>
                ))
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.noEvents}>
                  No events scheduled for this day.
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
