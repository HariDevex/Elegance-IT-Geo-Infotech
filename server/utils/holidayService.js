import db from "../config/database.js";

const INDIA_PUBLIC_HOLIDAYS = {
  "01-01": "New Year's Day",
  "01-14": "Makar Sankranti",
  "01-26": "Republic Day",
  "03-10": "Holi",
  "04-14": "Dr. B.R. Ambedkar Jayanti",
  "05-01": "May Day",
  "08-15": "Independence Day",
  "10-02": "Gandhi Jayanti",
  "10-31": "Diwali",
  "11-01": "Karnataka Rajyotsava",
  "12-25": "Christmas Day",
  "12-31": "New Year's Eve",
};

const getPublicHolidaysForYear = (year) => {
  const holidays = [];
  
  Object.entries(INDIA_PUBLIC_HOLIDAYS).forEach(([datePart, name]) => {
    const dateStr = `${year}-${datePart}`;
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      holidays.push({
        name,
        date: dateStr,
        type: "public",
        description: `National holiday: ${name}`,
      });
    }
  });
  
  return holidays;
};

const getSundaysForYear = (year) => {
  const sundays = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() === 0) {
      sundays.push({
        name: "Sunday",
        date: current.toISOString().split("T")[0],
        type: "sunday",
        description: "Weekly holiday",
      });
    }
    current.setDate(current.getDate() + 1);
  }
  
  return sundays;
};

const getAllHolidaysForYear = (year) => {
  return [...getPublicHolidaysForYear(year), ...getSundaysForYear(year)];
};

const populateHolidaysForYear = async (year) => {
  const holidays = getAllHolidaysForYear(year);
  
  const results = {
    added: 0,
    skipped: 0,
    errors: 0,
  };
  
  for (const holiday of holidays) {
    try {
      const existing = await db("holidays")
        .where("date", holiday.date)
        .first();
      
      if (existing) {
        results.skipped++;
        continue;
      }
      
      await db("holidays").insert({
        name: holiday.name,
        date: holiday.date,
        description: holiday.description,
        year: parseInt(year),
      });
      
      results.added++;
    } catch (error) {
      console.error(`Error adding holiday ${holiday.date}:`, error);
      results.errors++;
    }
  }
  
  return results;
};

const autoPopulateUpcomingYears = async (yearsAhead = 2) => {
  const currentYear = new Date().getFullYear();
  const results = [];
  
  for (let i = 0; i <= yearsAhead; i++) {
    const year = currentYear + i;
    const result = await populateHolidaysForYear(year);
    results.push({ year, ...result });
  }
  
  return results;
};

export { 
  getPublicHolidaysForYear, 
  getSundaysForYear, 
  getAllHolidaysForYear,
  populateHolidaysForYear,
  autoPopulateUpcomingYears,
  INDIA_PUBLIC_HOLIDAYS
};
