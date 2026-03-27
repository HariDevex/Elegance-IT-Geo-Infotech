import { getImageUrl } from "../utils/excel";

const DetailRow = ({ label, value }) => (
  <div className="flex items-center gap-3 text-sm">
    <span className="font-semibold text-slate-400">{label}:</span>
    <span className="bg-slate-700 text-white px-2 py-1 rounded">{value || "-"}</span>
  </div>
);

const EmployeeDetails = ({ employee, onBack }) => {
  if (!employee) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6">
        <p className="text-slate-400 text-center">No employee data available</p>
      </div>
    );
  }

  const avatarUrl = employee.avatar || employee.profileImage;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Employee Details</h2>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="h-24 w-24 rounded-full overflow-hidden bg-slate-800 border-2 border-indigo-500">
          {avatarUrl ? (
            <img
              src={getImageUrl(avatarUrl)}
              alt={employee.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-white bg-indigo-600">
              {(employee.name || "NA").slice(0, 2).toUpperCase()}
            </div>
          )}
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white">{employee.name}</h3>
          <p className="text-slate-400 capitalize">{employee.role}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DetailRow label="Employee ID" value={employee.employeeId} />
        <DetailRow label="Email" value={employee.email} />
        <DetailRow label="Date of Birth" value={employee.dob ? new Date(employee.dob).toLocaleDateString() : "-"} />
        <DetailRow label="Gender" value={employee.gender} />
        <DetailRow label="Department" value={employee.department} />
        <DetailRow label="Designation" value={employee.designation} />
        <DetailRow label="Marital Status" value={employee.maritalStatus} />
      </div>

      <div className="flex justify-end">
        <button
          onClick={onBack}
          className="rounded-lg px-6 py-2 text-sm font-semibold bg-slate-700 text-white hover:bg-slate-600"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default EmployeeDetails;
