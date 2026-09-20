"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

interface Student {
  id: string;
  studentId: string;
  name: string;
  phone?: string | null;
  photoUrl?: string | null;
  status: string;
}

interface GuardianChild {
  linkId: string;
  relation?: string | null;
  student: Student;
}

interface Guardian {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    status: string;
    createdAt: string;
  };
  children: GuardianChild[];
}

interface AccountInfo {
  userId: string;
  role: string;
  loginEmail: string;
  temporaryPassword: string;
  loginUrl: string;
}

const RELATIONS = [
  "Father",
  "Mother",
  "Guardian",
  "Brother",
  "Sister",
  "Uncle",
  "Aunt",
  "Other",
];

export default function GuardiansPage() {
  const [guardians, setGuardians] =
    useState<Guardian[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    showModal,
    setShowModal,
  ] = useState(false);

  const [
    account,
    setAccount,
  ] = useState<AccountInfo | null>(
    null,
  );

  const [search, setSearch] =
    useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    relation: "Father",
    password: "",
    studentIds: [] as string[],
  });

  const loadGuardians =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          "/api/guardians",
          {
            cache: "no-store",
          },
        );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load guardians.",
          );
        }

        setGuardians(
          Array.isArray(
            data.guardians,
          )
            ? data.guardians
            : [],
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load guardians.",
        );

        setGuardians([]);
      } finally {
        setLoading(false);
      }
    }, []);

  const loadStudents =
    useCallback(async () => {
      try {
        const res = await fetch(
          "/api/students?status=ACTIVE",
          {
            cache: "no-store",
          },
        );

        const data =
          await res.json();

        if (!res.ok) {
          return;
        }

        setStudents(
          Array.isArray(
            data.students,
          )
            ? data.students
            : [],
        );
      } catch (err) {
        console.error(err);
        setStudents([]);
      }
    }, []);

  useEffect(() => {
    loadGuardians();
    loadStudents();
  }, [
    loadGuardians,
    loadStudents,
  ]);

  function resetForm() {
    setForm({
      name: "",
      email: "",
      phone: "",
      relation: "Father",
      password: "",
      studentIds: [],
    });

    setError("");
  }

  function openModal() {
    resetForm();
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;

    setShowModal(false);
    resetForm();
  }

  function toggleStudent(
    studentId: string,
  ) {
    setForm((current) => {
      const exists =
        current.studentIds.includes(
          studentId,
        );

      return {
        ...current,
        studentIds: exists
          ? current.studentIds.filter(
              (id) =>
                id !== studentId,
            )
          : [
              ...current.studentIds,
              studentId,
            ],
      };
    });
  }

  function selectAllStudents() {
    setForm((current) => ({
      ...current,
      studentIds: students.map(
        (student) => student.id,
      ),
    }));
  }

  function clearStudents() {
    setForm((current) => ({
      ...current,
      studentIds: [],
    }));
  }

  async function handleSubmit(
    e: React.FormEvent,
  ) {
    e.preventDefault();

    setError("");

    if (!form.name.trim()) {
      setError(
        "Guardian name is required.",
      );
      return;
    }

    if (!form.email.trim()) {
      setError(
        "Guardian email is required.",
      );
      return;
    }

    if (
      form.studentIds.length ===
      0
    ) {
      setError(
        "Please select at least one student.",
      );
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        "/api/guardians",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name:
              form.name.trim(),
            email:
              form.email
                .trim()
                .toLowerCase(),
            phone:
              form.phone.trim(),
            relation:
              form.relation,
            password:
              form.password.trim(),
            studentIds:
              form.studentIds,
          }),
        },
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to create guardian account.",
        );
      }

      setShowModal(false);

      setAccount(
        data.account || null,
      );

      resetForm();

      await loadGuardians();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create guardian account.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const filteredGuardians =
    guardians.filter(
      (guardian) => {
        const q =
          search
            .trim()
            .toLowerCase();

        if (!q) return true;

        return (
          guardian.user.name
            .toLowerCase()
            .includes(q) ||
          guardian.user.email
            .toLowerCase()
            .includes(q) ||
          (
            guardian.user
              .phone || ""
          )
            .toLowerCase()
            .includes(q) ||
          guardian.children.some(
            (child) =>
              child.student.name
                .toLowerCase()
                .includes(q) ||
              child.student.studentId
                .toLowerCase()
                .includes(q),
          )
        );
      },
    );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Guardians
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create guardian accounts and
            link multiple students to one
            guardian.
          </p>
        </div>

        <button
          type="button"
          onClick={
            openModal
          }
          className="btn btn-primary"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>

          Add Guardian
        </button>
      </div>

      {/* Error */}
      {error && !showModal && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="card">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>

          <input
            className="form-input pl-9"
            placeholder="Search guardian or student..."
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value,
              )
            }
          />
        </div>
      </div>

      {/* Guardian list */}
      <div className="card p-0">
        {loading ? (
          <div className="flex justify-center py-14">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGuardians.length ===
          0 ? (
          <div className="py-14 text-center">
            <div className="text-4xl">
              👨‍👩‍👧
            </div>

            <p className="mt-3 font-semibold text-slate-600">
              No guardian accounts found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Create a guardian account
              and link one or more students.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Guardian</th>
                  <th>Phone</th>
                  <th>Students</th>
                  <th>Relation</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>

              <tbody>
                {filteredGuardians.map(
                  (guardian) => (
                    <tr
                      key={
                        guardian.user.id
                      }
                    >
                      <td>
                        <div>
                          <p className="font-semibold text-slate-700">
                            {
                              guardian
                                .user
                                .name
                            }
                          </p>

                          <p className="text-xs text-slate-400">
                            {
                              guardian
                                .user
                                .email
                            }
                          </p>
                        </div>
                      </td>

                      <td className="text-slate-500">
                        {
                          guardian
                            .user
                            .phone ||
                          "—"
                        }
                      </td>

                      <td>
                        <div className="space-y-1">
                          {guardian.children.map(
                            (
                              child,
                            ) => (
                              <div
                                key={
                                  child.linkId
                                }
                                className="flex items-center gap-2"
                              >
                                <div className="w-7 h-7 rounded-full overflow-hidden bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                                  {child.student
                                    .photoUrl ? (
                                    <img
                                      src={
                                        child
                                          .student
                                          .photoUrl
                                      }
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    child.student.name
                                      .split(
                                        /\s+/,
                                      )
                                      .filter(
                                        Boolean,
                                      )
                                      .map(
                                        (
                                          part,
                                        ) =>
                                          part[0],
                                      )
                                      .join(
                                        "",
                                      )
                                      .slice(
                                        0,
                                        2,
                                      )
                                      .toUpperCase()
                                  )}
                                </div>

                                <div>
                                  <p className="text-sm font-medium text-slate-700">
                                    {
                                      child
                                        .student
                                        .name
                                    }
                                  </p>

                                  <p className="text-[11px] text-slate-400">
                                    {
                                      child
                                        .student
                                        .studentId
                                    }
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1">
                          {guardian.children.map(
                            (
                              child,
                            ) => (
                              <span
                                key={
                                  child.linkId
                                }
                                className="badge badge-gray"
                              >
                                {
                                  child.relation ||
                                  "Guardian"
                                }
                              </span>
                            ),
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            guardian.user
                              .status ===
                            "ACTIVE"
                              ? "badge-green"
                              : "badge-gray"
                          }`}
                        >
                          {
                            guardian
                              .user
                              .status
                          }
                        </span>
                      </td>

                      <td className="text-slate-500">
                        {new Date(
                          guardian
                            .user
                            .createdAt,
                        ).toLocaleDateString(
                          "en-BD",
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Guardian Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target ===
              e.currentTarget &&
              !submitting
            ) {
              closeModal();
            }
          }}
        >
          <div className="modal-box max-w-3xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Create Guardian Account
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  One guardian can be linked
                  with multiple students.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeModal
                }
                disabled={
                  submitting
                }
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
            >
              <div className="modal-body space-y-5">
                {error && (
                  <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">
                      Guardian Name *
                    </label>

                    <input
                      className="form-input"
                      placeholder="Full name"
                      value={
                        form.name
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            name: e.target
                              .value,
                          }),
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Phone
                    </label>

                    <input
                      className="form-input"
                      placeholder="01XXXXXXXXX"
                      value={
                        form.phone
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            phone: e.target
                              .value,
                          }),
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Email *
                    </label>

                    <input
                      type="email"
                      className="form-input"
                      placeholder="guardian@email.com"
                      value={
                        form.email
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            email: e.target
                              .value,
                          }),
                        )
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Relation
                    </label>

                    <select
                      className="form-select"
                      value={
                        form.relation
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            relation:
                              e.target
                                .value,
                          }),
                        )
                      }
                    >
                      {RELATIONS.map(
                        (relation) => (
                          <option
                            key={
                              relation
                            }
                            value={
                              relation
                            }
                          >
                            {relation}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">
                      Password
                      <span className="ml-1 text-xs text-slate-400">
                        optional — auto-generated if empty
                      </span>
                    </label>

                    <input
                      type="password"
                      className="form-input"
                      placeholder="Leave blank for automatic password"
                      value={
                        form.password
                      }
                      onChange={(e) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            password:
                              e.target
                                .value,
                          }),
                        )
                      }
                    />
                  </div>
                </div>

                {/* Student selection */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <label className="form-label mb-0">
                        Select Students *
                      </label>

                      <p className="text-xs text-slate-400 mt-1">
                        Select multiple students
                        for this guardian.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={
                          selectAllStudents
                        }
                        className="btn btn-outline btn-sm"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={
                          clearStudents
                        }
                        className="btn btn-ghost btn-sm"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2">
                    {students.length ===
                    0 ? (
                      <div className="py-8 text-center text-sm text-slate-400">
                        No active students found.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {students.map(
                          (student) => {
                            const selected =
                              form.studentIds.includes(
                                student.id,
                              );

                            return (
                              <button
                                key={
                                  student.id
                                }
                                type="button"
                                onClick={() =>
                                  toggleStudent(
                                    student.id,
                                  )
                                }
                                className={`w-full flex items-center gap-3 rounded-xl p-3 text-left transition ${
                                  selected
                                    ? "bg-blue-50 border border-blue-200"
                                    : "bg-white border border-transparent hover:border-slate-200"
                                }`}
                              >
                                <div
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 ${
                                    selected
                                      ? "bg-blue-600 border-blue-600 text-white"
                                      : "bg-white border-slate-300"
                                  }`}
                                >
                                  {selected && (
                                    <svg
                                      className="w-3.5 h-3.5"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </div>

                                <div className="w-9 h-9 rounded-full overflow-hidden bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                                  {student.photoUrl ? (
                                    <img
                                      src={
                                        student.photoUrl
                                      }
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    student.name
                                      .split(
                                        /\s+/,
                                      )
                                      .filter(
                                        Boolean,
                                      )
                                      .map(
                                        (
                                          part,
                                        ) =>
                                          part[0],
                                      )
                                      .join(
                                        "",
                                      )
                                      .slice(
                                        0,
                                        2,
                                      )
                                      .toUpperCase()
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-700 truncate">
                                    {
                                      student.name
                                    }
                                  </p>

                                  <p className="text-xs text-slate-400">
                                    {
                                      student.studentId
                                    }
                                    {student.phone
                                      ? ` · ${student.phone}`
                                      : ""}
                                  </p>
                                </div>
                              </button>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs font-semibold text-blue-600">
                    {form.studentIds.length} student(s) selected
                  </p>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  disabled={
                    submitting
                  }
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Creating..."
                    : "Create Guardian Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login credentials modal */}
      {account && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setAccount(null);
            }
          }}
        >
          <div className="modal-box max-w-md">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Guardian Account Created
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Save these credentials before
                  closing.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setAccount(null)
                }
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <div className="modal-body space-y-4">
              <CredentialBox
                label="Login Email"
                value={
                  account.loginEmail
                }
              />

              <CredentialBox
                label="Temporary Password"
                value={
                  account.temporaryPassword
                }
                highlight
              />

              <CredentialBox
                label="Login URL"
                value="/"
              />

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
                This guardian can use the same
                account to access all linked
                children.
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={() => {
                  const text = [
                    "Easylearn Institute - Guardian Login",
                    "",
                    `Login Email: ${account.loginEmail}`,
                    `Temporary Password: ${account.temporaryPassword}`,
                    "Login URL: /",
                  ].join("\n");

                  navigator.clipboard
                    ?.writeText(text)
                    .catch(() => {});
                }}
                className="btn btn-outline"
              >
                Copy Credentials
              </button>

              <button
                type="button"
                onClick={() =>
                  setAccount(null)
                }
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CredentialBox({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <div
        className={`mt-1 rounded-xl border p-3 font-semibold break-all ${
          highlight
            ? "bg-amber-50 border-amber-200 text-slate-800"
            : "bg-slate-50 border-slate-200 text-slate-700"
        }`}
      >
        {value}
      </div>
    </div>
  );
}