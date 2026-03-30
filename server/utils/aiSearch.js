import db from "../config/database.js";

const SEARCH_WEIGHTS = {
  employee: {
    name: 10,
    email: 8,
    employee_id: 7,
    department: 5,
    designation: 5,
  },
  leave: {
    type: 8,
    status: 7,
    description: 5,
  },
  announcement: {
    title: 10,
    message: 7,
  },
};

class AISearchEngine {
  parseNaturalQuery(query) {
    const lowerQuery = query.toLowerCase();
    
    const filters = {
      type: null,
      status: null,
      department: null,
      role: null,
      dateRange: null,
      sortBy: "relevance",
    };

    const typePatterns = [
      { pattern: /employee|s|staff|worker|person/i, value: "employee" },
      { pattern: /leave|vacation|time off|absent/i, value: "leave" },
      { pattern: /announcement|notice|news|update/i, value: "announcement" },
      { pattern: /holiday|festival|vacation/i, value: "holiday" },
    ];

    for (const { pattern, value } of typePatterns) {
      if (pattern.test(lowerQuery)) {
        filters.type = value;
        break;
      }
    }

    const statusPatterns = [
      { pattern: /pending|waiting|awaiting/i, value: "Pending" },
      { pattern: /approved|accepted|allowed/i, value: "Approved" },
      { pattern: /rejected|declined|denied/i, value: "Rejected" },
      { pattern: /active|present|online/i, value: "active" },
      { pattern: /inactive|absent|offline/i, value: "inactive" },
    ];

    for (const { pattern, value } of statusPatterns) {
      if (pattern.test(lowerQuery)) {
        filters.status = value;
        break;
      }
    }

    const deptPatterns = [
      { pattern: /IT|tech|engineering|development/i, value: "IT" },
      { pattern: /HR|human resources|recruitment/i, value: "HR" },
      { pattern: /sales|marketing|bd/i, value: "Sales" },
      { pattern: /finance|accounting|accounts/i, value: "Finance" },
      { pattern: /operations|ops/i, value: "Operations" },
    ];

    for (const { pattern, value } of deptPatterns) {
      if (pattern.test(lowerQuery)) {
        filters.department = value;
        break;
      }
    }

    if (/latest|newest|recent/i.test(lowerQuery)) {
      filters.sortBy = "date";
    }

    return {
      originalQuery: query,
      keywords: this.extractKeywords(query),
      filters,
    };
  }

  extractKeywords(query) {
    const stopWords = ["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "get", "show", "find", "give", "tell", "say", "seek", "keep", "let", "put", "set", "make", "draw", "turn", "come", "go", "know", "see", "get", "how", "what", "who", "which", "when", "where", "why"];
    
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word));
  }

  calculateRelevance(item, searchData, type) {
    let score = 0;
    const weights = SEARCH_WEIGHTS[type] || {};

    for (const keyword of searchData.keywords) {
      for (const [field, weight] of Object.entries(weights)) {
        const value = String(item[field] || "").toLowerCase();
        
        if (value.includes(keyword)) {
          score += weight;
          
          if (value.startsWith(keyword)) {
            score += weight * 0.5;
          }
          
          if (value === keyword) {
            score += weight * 0.5;
          }
        }
      }
    }

    if (searchData.filters.status) {
      const statusMatch = String(item.status || "").toLowerCase() === 
        searchData.filters.status.toLowerCase();
      if (statusMatch) score += 15;
    }

    if (searchData.filters.department) {
      const deptMatch = String(item.department || "").toLowerCase().includes(
        searchData.filters.department.toLowerCase()
      );
      if (deptMatch) score += 12;
    }

    return score;
  }

  async searchEmployees(query, userRole, userId, limit = 20) {
    const searchData = this.parseNaturalQuery(query);
    const searchTerm = `%${searchData.keywords.join("%")}%`;

    let dbQuery = db("users")
      .select(
        "id",
        "name",
        "email",
        "role",
        "employee_id",
        "department",
        "designation",
        "attendance_status",
        "profile_image",
        "created_at"
      );

    if (searchTerm && searchTerm !== "%%") {
      dbQuery = dbQuery.where(function() {
        this.where("name", "like", searchTerm)
          .orWhere("email", "like", searchTerm)
          .orWhere("employee_id", "like", searchTerm)
          .orWhere("department", "like", searchTerm)
          .orWhere("designation", "like", searchTerm);
      });
    }

    if (searchData.filters.department) {
      dbQuery = dbQuery.where("department", "like", `%${searchData.filters.department}%`);
    }

    if (searchData.filters.role) {
      dbQuery = dbQuery.where("role", searchData.filters.role);
    }

    if (!["root", "admin", "manager", "hr"].includes(userRole)) {
      dbQuery = dbQuery.where("id", userId);
    }

    const results = await dbQuery.orderBy("created_at", "desc").limit(limit * 2);

    const scoredResults = results
      .map(item => ({
        ...item,
        _score: this.calculateRelevance(item, searchData, "employee"),
        _type: "employee",
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    return scoredResults;
  }

  async searchLeaves(query, userRole, userId, limit = 20) {
    const searchData = this.parseNaturalQuery(query);
    const searchTerm = `%${searchData.keywords.join("%")}%`;

    let dbQuery = db("leaves")
      .join("users", "leaves.user_id", "users.id")
      .select(
        "leaves.id",
        "leaves.type",
        "leaves.from_date",
        "leaves.to_date",
        "leaves.status",
        "leaves.description",
        "leaves.created_at",
        "users.name as user_name",
        "users.employee_id"
      );

    if (searchTerm && searchTerm !== "%%") {
      dbQuery = dbQuery.where(function() {
        this.where("users.name", "like", searchTerm)
          .orWhere("leaves.type", "like", searchTerm)
          .orWhere("leaves.description", "like", searchTerm);
      });
    }

    if (searchData.filters.status) {
      dbQuery = dbQuery.where("leaves.status", searchData.filters.status);
    }

    if (["root", "admin", "manager", "hr"].includes(userRole)) {
    } else {
      dbQuery = dbQuery.where("leaves.user_id", userId);
    }

    const results = await dbQuery.orderBy("leaves.created_at", "desc").limit(limit * 2);

    const scoredResults = results
      .map(item => ({
        ...item,
        _score: this.calculateRelevance(item, searchData, "leave"),
        _type: "leave",
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    return scoredResults;
  }

  async searchAnnouncements(query, userRole, limit = 20) {
    const searchData = this.parseNaturalQuery(query);
    const searchTerm = `%${searchData.keywords.join("%")}%`;

    let dbQuery = db("announcements")
      .select(
        "id",
        "title",
        "message",
        "created_at"
      );

    if (searchTerm && searchTerm !== "%%") {
      dbQuery = dbQuery.where(function() {
        this.where("title", "like", searchTerm)
          .orWhere("message", "like", searchTerm);
      });
    }

    const results = await dbQuery.orderBy("created_at", "desc").limit(limit * 2);

    const scoredResults = results
      .map(item => ({
        ...item,
        _score: this.calculateRelevance(item, searchData, "announcement"),
        _type: "announcement",
      }))
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    return scoredResults;
  }

  async unifiedSearch(query, userRole, userId, options = {}) {
    const { limit = 10, types = ["employee", "leave", "announcement"] } = options;
    
    const searchData = this.parseNaturalQuery(query);
    
    const results = {
      query: searchData.originalQuery,
      total: 0,
      results: [],
    };

    const searchPromises = [];

    if (types.includes("employee")) {
      searchPromises.push(
        this.searchEmployees(query, userRole, userId, limit)
          .then(items => ({ type: "employee", items }))
      );
    }

    if (types.includes("leave")) {
      searchPromises.push(
        this.searchLeaves(query, userRole, userId, limit)
          .then(items => ({ type: "leave", items }))
      );
    }

    if (types.includes("announcement")) {
      searchPromises.push(
        this.searchAnnouncements(query, userRole, limit)
          .then(items => ({ type: "announcement", items }))
      );
    }

    const searchResults = await Promise.all(searchPromises);

    for (const { type, items } of searchResults) {
      for (const item of items) {
        results.results.push(item);
      }
    }

    results.results.sort((a, b) => b._score - a._score);
    results.results = results.results.slice(0, limit * types.length);
    results.total = results.results.length;

    results.suggestions = this.getSuggestions(searchData, results.total);

    return results;
  }

  getSuggestions(searchData, resultCount) {
    const suggestions = [];

    if (resultCount === 0) {
      suggestions.push("Try using fewer keywords");
      suggestions.push("Check the spelling of your search terms");
      
      if (!searchData.filters.type) {
        suggestions.push("Try specifying a type: employees, leaves, or announcements");
      }
    }

    return suggestions;
  }
}

const aiSearch = new AISearchEngine();

export const smartSearch = async (req, res) => {
  try {
    const { q, type, limit = 10 } = req.query;
    const userRole = req.user.role;
    const userId = req.user._id;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: "Search query must be at least 2 characters",
      });
    }

    const types = type ? type.split(",") : ["employee", "leave", "announcement"];

    const results = await aiSearch.unifiedSearch(q, userRole, userId, {
      limit: parseInt(limit),
      types,
    });

    res.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({
      success: false,
      error: "Search failed",
    });
  }
};

export default aiSearch;
