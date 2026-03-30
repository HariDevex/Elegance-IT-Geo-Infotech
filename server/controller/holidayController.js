import db from "../config/database.js";
import { populateHolidaysForYear, autoPopulateUpcomingYears, getAllHolidaysForYear } from "../utils/holidayService.js";

const getHolidays = async (req, res, next) => {
  try {
    const { year, type } = req.query;
    const targetYear = year || new Date().getFullYear();

    let query = db("holidays");

    if (type) {
      query = query.where("type", type);
    }

    const holidays = await query.orderBy("date");

    const filteredHolidays = holidays.filter(h => {
      const holidayYear = new Date(h.date).getFullYear().toString();
      return holidayYear === targetYear;
    });

    res.json({
      success: true,
      holidays: filteredHolidays.map(h => ({
        _id: h.id,
        name: h.name,
        date: h.date,
        type: h.type,
        description: h.description,
        year: new Date(h.date).getFullYear(),
      })),
    });
  } catch (error) {
    next(error);
  }
};

const createHoliday = async (req, res, next) => {
  try {
    if (!["root", "admin", "manager", "hr", "teamlead"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { name, date, type = "public", description } = req.body;

    if (!name || !date) {
      return res.status(400).json({ success: false, error: "Name and date required" });
    }

    const year = new Date(date).getFullYear();

    const [holiday] = await db("holidays")
      .insert({
        name,
        date,
        type,
        description,
        year,
      })
      .returning("*");

    res.status(201).json({
      success: true,
      holiday: {
        _id: holiday.id,
        name: holiday.name,
        date: holiday.date,
        type: holiday.type,
        description: holiday.description,
        year: holiday.year,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteHoliday = async (req, res, next) => {
  try {
    if (!["root", "admin", "manager", "hr", "teamlead"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { id } = req.params;

    await db("holidays").where("id", id).del();

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const getUpcomingHolidays = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const year = new Date().getFullYear();

    const holidays = await db("holidays")
      .where("date", ">=", today)
      .where("year", year)
      .orderBy("date")
      .limit(10);

    res.json({
      success: true,
      holidays: holidays.map(h => ({
        _id: h.id,
        name: h.name,
        date: h.date,
        type: h.type,
      })),
    });
  } catch (error) {
    next(error);
  }
};

const autoPopulateHolidays = async (req, res, next) => {
  try {
    if (!["root", "admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Not authorized" });
    }

    const { year, years } = req.query;
    
    let results;
    
    if (year) {
      results = [await populateHolidaysForYear(parseInt(year))];
    } else if (years) {
      results = await autoPopulateUpcomingYears(parseInt(years));
    } else {
      results = await autoPopulateUpcomingYears(2);
    }

    res.json({
      success: true,
      message: "Holidays populated successfully",
      results,
    });
  } catch (error) {
    next(error);
  }
};

export { getHolidays, createHoliday, deleteHoliday, getUpcomingHolidays, autoPopulateHolidays };
