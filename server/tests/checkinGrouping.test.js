import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockDb, makeTable } = vi.hoisted(() => {
  const makeTable = () => {
    const chain = vi.fn(() => chain);
    chain.join = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.where = vi.fn(() => chain);
    chain.whereBetween = vi.fn(() => chain);
    chain.orderBy = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    chain.then = vi.fn((cb) => cb([]));
    // Implementation for the actual grouping logic test
    chain.resolve = (data) => {
      chain.then = vi.fn((cb) => Promise.resolve(cb(data)));
      return chain;
    };
    return chain;
  };
  const mockDb = vi.fn(() => makeTable());
  return { mockDb, makeTable };
});

vi.mock("../config/database.js", () => ({ default: mockDb }));

const { getMyRecords, getAllCheckinRecords } = await import("../controller/checkinController.js");

describe("Checkin Controller — getMyRecords grouping logic", () => {
  beforeEach(() => {
    mockDb.mockImplementation(() => makeTable());
  });

  it("should correctly group check-ins and check-outs using parent_id", async () => {
    const userId = "u1";
    const checkinId = "ci-1";
    const checkoutId = "co-1";
    
    const mockRecords = [
      {
        id: checkinId,
        user_id: userId,
        type: "checkin",
        created_at: "2026-06-04T09:00:00.000Z",
        note: "In"
      },
      {
        id: checkoutId,
        user_id: userId,
        parent_id: checkinId,
        type: "checkout",
        created_at: "2026-06-04T17:00:00.000Z",
        note: "Out"
      }
    ];

    const table = makeTable();
    table.then = vi.fn((cb) => Promise.resolve(cb(mockRecords)));
    mockDb.mockImplementation(() => table);

    const req = { user: { id: userId }, query: {} };
    const res = { json: vi.fn() };
    const next = vi.fn();

    await getMyRecords(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      records: expect.arrayContaining([
        expect.objectContaining({
          checkin: expect.objectContaining({ _id: checkinId }),
          checkout: expect.objectContaining({ _id: checkoutId }),
          duration: 480 // 8 hours
        })
      ])
    }));
  });

  it("should handle unmatched check-ins (active sessions)", async () => {
    const userId = "u1";
    const mockRecords = [
      {
        id: "ci-2",
        user_id: userId,
        type: "checkin",
        created_at: "2026-06-04T10:00:00.000Z",
        note: "Still here"
      }
    ];

    const table = makeTable();
    table.then = vi.fn((cb) => Promise.resolve(cb(mockRecords)));
    mockDb.mockImplementation(() => table);

    const req = { user: { id: userId }, query: {} };
    const res = { json: vi.fn() };
    await getMyRecords(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      records: [
        expect.objectContaining({
          checkin: expect.objectContaining({ _id: "ci-2" }),
          checkout: null,
          duration: null
        })
      ]
    }));
  });

  describe("getAllCheckinRecords", () => {
    it("should return all records with user info for authorized roles", async () => {
      const mockRecords = [
        {
          id: "ci-3",
          user_id: "u1",
          type: "checkin",
          created_at: "2026-06-04T11:00:00.000Z",
          name: "User One",
          employee_id: "E1",
          department: "D1"
        }
      ];

      const table = makeTable();
      table.then = vi.fn((cb) => Promise.resolve(cb(mockRecords)));
      mockDb.mockImplementation(() => table);

      const req = { user: { id: "admin-1", role: "admin" }, query: {} };
      const res = { json: vi.fn() };
      await getAllCheckinRecords(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        records: expect.arrayContaining([
          expect.objectContaining({
            user: expect.objectContaining({ name: "User One", employeeId: "E1" })
          })
        ])
      }));
    });

    it("should reject unauthorized roles", async () => {
      const res = { status: vi.fn(() => res), json: vi.fn() };
      await getAllCheckinRecords({ user: { id: "u1", role: "developer" }, query: {} }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
