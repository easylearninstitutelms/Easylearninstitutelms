"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

type ProgrammeSemester = {
  id: string;
  semesterNo: number;
  name: string;
};
type ProgrammeClass = { id: string; classNo?: number | null; title: string; semesterId?: string | null; };

type Programme = {
  id: string;
  name: string;
  code?: string | null;
  semesters: ProgrammeSemester[];
};

type Batch = {
  id: string;
  name: string;
  programmeId?: string | null;
  programmeName?: string | null;
  semesterId?: string | null;
  semesterName?: string | null;
};

type ExamSubject = {
  id: string;
  subjectName: string;
  totalMarks: number;
};

type ExamMode = "BATCH" | "PROGRAMME" | "COURSE";

type Course = { id: string; name: string; courseNo?: string | null; };
type CourseClass = { id: string; classNo?: number | null; title: string; status?: string | null; };

type Exam = {
  id: string;
  name: string;
  batchId?: string | null;
  examDate: string | null;
  createdAt: string;
  programmeId?: string | null;
  semesterId?: string | null;
  programmeClassId?: string | null;
  courseId?: string | null;
  courseClassId?: string | null;
};

type ExamRow = {
  exam: Exam;
  mode: ExamMode;
  batchName: string;
  programmeName?: string | null;
  semesterName?: string | null;
  courseName?: string | null;
  courseClassNo?: number | null;
  courseClassTitle?: string | null;
  subjects?: ExamSubject[];
};

type Student = {
  id: string;
  studentId: string;
  name: string;
  photoUrl?: string | null;
};

type ResultRecord = {
  id: string;
  examId: string;
  examSubjectId: string | null;
  studentId: string;
  marks: number | string | null;
  grade: string | null;
  remarks: string | null;
};

type ResultApiRow = {
  result?: ResultRecord | null;
  student?: Student | null;
  subject?: ExamSubject | null;
};

type MarkEntry = {
  resultId?: string;
  marks: string;
  remarks: string;
};

type ResultPayload = {
  examId: string;
  examSubjectId: string;
  studentId: string;
  marks: number;
  grade: string;
  remarks: string | null;
};

type NoticeType = "success" | "error";

type Notice = {
  type: NoticeType;
  message: string;
};

type MarksheetSubjectRow = {
  subject: ExamSubject;
  marks: number | null;
  percentage: number;
  grade: string;
  passMark: number;
  status: "PASS" | "FAIL" | "PENDING";
  remarks: string;
};

function calculatePassMark(totalMarks: number): number {
  if (!Number.isFinite(totalMarks) || totalMarks <= 0) return 0;
  return Math.ceil(totalMarks * 0.33);
}

type MarksheetData = {
  student: Student;
  subjects: MarksheetSubjectRow[];
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  result: "PASS" | "FAIL" | "INCOMPLETE";
};

const EMPTY_SUBJECT = {
  subjectName: "",
  totalMarks: "100",
};

const RESULT_PAGE_SIZE = 1000;

function calculateGrade(
  marks: number,
  totalMarks: number
): string {
  if (
    !Number.isFinite(marks) ||
    !Number.isFinite(totalMarks) ||
    totalMarks <= 0
  ) {
    return "F";
  }

  const percentage =
    (marks / totalMarks) * 100;

  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "A-";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";

  return "F";
}

function calculateOverallGrade(
  percentage: number
): string {
  if (!Number.isFinite(percentage)) {
    return "F";
  }

  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "A-";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";

  return "F";
}

function normalizeSubjects(
  value: unknown
): ExamSubject[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (item: unknown): ExamSubject | null => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return null;
        }

        const row =
          item as Record<string, unknown>;

        const id =
          typeof row.id === "string"
            ? row.id
            : "";

        const subjectName =
          typeof row.subjectName === "string"
            ? row.subjectName
            : "";

        const totalMarks =
          Number(row.totalMarks);

        if (
          !id ||
          !subjectName ||
          !Number.isFinite(totalMarks)
        ) {
          return null;
        }

        return {
          id,
          subjectName,
          totalMarks,
        };
      }
    )
    .filter(
      (
        item: ExamSubject | null
      ): item is ExamSubject =>
        item !== null
    );
}

function normalizeExamRows(
  value: unknown
): ExamRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (item: unknown): ExamRow | null => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return null;
        }

        const row =
          item as Record<string, unknown>;

        if (
          !row.exam ||
          typeof row.exam !== "object"
        ) {
          return null;
        }

        const exam =
          row.exam as Record<string, unknown>;

        const id =
          typeof exam.id === "string"
            ? exam.id
            : "";

        const name =
          typeof exam.name === "string"
            ? exam.name
            : "";

        if (!id || !name) {
          return null;
        }

        const mode: ExamMode =
          row.mode === "COURSE"
            ? "COURSE"
            : row.mode === "PROGRAMME"
              ? "PROGRAMME"
              : "BATCH";

        return {
          exam: {
            id,
            name,
            batchId:
              typeof exam.batchId === "string"
                ? exam.batchId
                : null,
            examDate:
              typeof exam.examDate === "string"
                ? exam.examDate
                : null,
            createdAt:
              typeof exam.createdAt === "string"
                ? exam.createdAt
                : new Date().toISOString(),
            programmeId:
              typeof exam.programmeId === "string"
                ? exam.programmeId
                : null,
            semesterId:
              typeof exam.semesterId === "string"
                ? exam.semesterId
                : null,
            programmeClassId:
              typeof exam.programmeClassId === "string"
                ? exam.programmeClassId
                : null,
            courseId:
              typeof exam.courseId === "string"
                ? exam.courseId
                : null,
            courseClassId:
              typeof exam.courseClassId === "string"
                ? exam.courseClassId
                : null,
          },
          mode,
          batchName:
            typeof row.batchName === "string"
              ? row.batchName
              : "Unknown Batch",
          programmeName:
            typeof row.programmeName === "string"
              ? row.programmeName
              : null,
          semesterName:
            typeof row.semesterName === "string"
              ? row.semesterName
              : null,
          courseName:
            typeof row.courseName === "string"
              ? row.courseName
              : null,
          courseClassNo:
            row.courseClassNo == null ? null : Number(row.courseClassNo),
          courseClassTitle:
            typeof row.courseClassTitle === "string"
              ? row.courseClassTitle
              : null,
          subjects: normalizeSubjects(
            row.subjects
          ),
        };
      }
    )
    .filter(
      (
        item: ExamRow | null
      ): item is ExamRow =>
        item !== null
    );
}

function normalizeStudents(
  value: unknown
): Student[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (item: unknown): Student | null => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return null;
        }

        const source =
          item as Record<string, unknown>;

        const studentValue =
          source.student &&
          typeof source.student === "object"
            ? source.student
            : source;

        if (
          !studentValue ||
          typeof studentValue !== "object"
        ) {
          return null;
        }

        const student =
          studentValue as Record<
            string,
            unknown
          >;

        const id =
          typeof student.id === "string"
            ? student.id
            : "";

        const studentId =
          typeof student.studentId === "string"
            ? student.studentId
            : "";

        const name =
          typeof student.name === "string"
            ? student.name
            : "";

        if (
          !id ||
          !studentId ||
          !name
        ) {
          return null;
        }

        return {
          id,
          studentId,
          name,
          photoUrl:
            typeof student.photoUrl ===
            "string"
              ? student.photoUrl
              : null,
        };
      }
    )
    .filter(
      (
        item: Student | null
      ): item is Student =>
        item !== null
    );
}

function normalizeResultRows(
  value: unknown
): ResultApiRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(
      (
        item: unknown
      ): ResultApiRow | null => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return null;
        }

        const row =
          item as Record<string, unknown>;

        if (
          row.result &&
          typeof row.result === "object"
        ) {
          return {
            result:
              row.result as ResultRecord,
            student:
              row.student &&
              typeof row.student ===
                "object"
                ? (row.student as Student)
                : null,
            subject:
              row.subject &&
              typeof row.subject ===
                "object"
                ? (row.subject as ExamSubject)
                : null,
          };
        }

        if (
          typeof row.id === "string" &&
          typeof row.studentId === "string"
        ) {
          return {
            result:
              row as unknown as ResultRecord,
            student: null,
            subject: null,
          };
        }

        return null;
      }
    )
    .filter(
      (
        item: ResultApiRow | null
      ): item is ResultApiRow =>
        item !== null
    );
}

export default function ExamsPage() {
  const [exams, setExams] =
    useState<ExamRow[]>([]);

  const [batches, setBatches] =
    useState<Batch[]>([]);

  const [programmes, setProgrammes] =
    useState<Programme[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [courseClasses, setCourseClasses] =
    useState<CourseClass[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingBatches, setLoadingBatches] =
    useState(true);

  const [pageError, setPageError] =
    useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [selectedExamId, setSelectedExamId] =
    useState<string | null>(null);

  const [examMode, setExamMode] =
    useState<ExamMode>("BATCH");

  const [examProgrammeId, setExamProgrammeId] =
    useState("");

  const [examSemesterId, setExamSemesterId] =
    useState("");
  const [examProgrammeClassId, setExamProgrammeClassId] = useState("");
  const [programmeClasses, setProgrammeClasses] = useState<ProgrammeClass[]>([]);

  const [examBatchId, setExamBatchId] =
    useState("");

  const [examCourseId, setExamCourseId] =
    useState("");

  const [examCourseClassId, setExamCourseClassId] =
    useState("");

  const [examName, setExamName] =
    useState("");

  const [examDate, setExamDate] =
    useState("");

  const [subjects, setSubjects] =
    useState([
      { ...EMPTY_SUBJECT },
    ]);

  const [notice, setNotice] =
    useState<Notice | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [results, setResults] =
    useState<ResultApiRow[]>([]);

  const [loadingStudents, setLoadingStudents] =
    useState(false);

  const [loadingResults, setLoadingResults] =
    useState(false);

  const [
    selectedSubjectId,
    setSelectedSubjectId,
  ] = useState<string | null>(null);

  const [markEntries, setMarkEntries] =
    useState<Record<string, MarkEntry>>({});

  const [studentSearch, setStudentSearch] =
    useState("");

  const [showRemarks, setShowRemarks] =
    useState(false);

  const [savingResults, setSavingResults] =
    useState(false);

  const [resultMessage, setResultMessage] =
    useState("");

  const [showMarksheet, setShowMarksheet] =
    useState(false);

  const [marksheetStudentId, setMarksheetStudentId] =
    useState<string | null>(null);

  const [marksheetSearch, setMarksheetSearch] =
    useState("");

  const [marksheetLoading, setMarksheetLoading] =
    useState(false);

  const [marksheetMessage, setMarksheetMessage] =
    useState("");
  const [marksheetMode, setMarksheetMode] = useState<"COURSE" | "PROGRAMME">("COURSE");
  const [marksheetProgrammeId, setMarksheetProgrammeId] = useState("");
  const [marksheetSemesterId, setMarksheetSemesterId] = useState("");
  const [marksheetProgrammeClassId, setMarksheetProgrammeClassId] = useState("");
  const [marksheetCourseId, setMarksheetCourseId] = useState("");
  const [marksheetCourseClassId, setMarksheetCourseClassId] = useState("");

  const marksheetProgrammeSemesters = useMemo(
    () => programmes.find((programme) => programme.id === marksheetProgrammeId)?.semesters ?? [],
    [programmes, marksheetProgrammeId]
  );

  const marksheetCourseExams = useMemo(
    () => exams.filter((item) =>
      item.mode === "COURSE" &&
      (!marksheetCourseId || item.exam.courseId === marksheetCourseId) &&
      (!marksheetCourseClassId || item.exam.courseClassId === marksheetCourseClassId)
    ),
    [exams, marksheetCourseId, marksheetCourseClassId]
  );

  const marksheetProgrammeClasses = useMemo(() => programmeClasses.filter((item) => !marksheetSemesterId || item.semesterId === marksheetSemesterId), [programmeClasses, marksheetSemesterId]);

  const marksheetProgrammeExams = useMemo(
    () => exams.filter((item) =>
      item.mode === "PROGRAMME" &&
      (!marksheetProgrammeId || item.exam.programmeId === marksheetProgrammeId) &&
      (!marksheetSemesterId || item.exam.semesterId === marksheetSemesterId) && (!marksheetProgrammeClassId || item.exam.programmeClassId === marksheetProgrammeClassId)
    ),
    [exams, marksheetProgrammeId, marksheetSemesterId, marksheetProgrammeClassId]
  );

  const marksheetTargetExams = marksheetMode === "COURSE" ? marksheetCourseExams : marksheetProgrammeExams;

  const selectedExam = useMemo(
    () =>
      exams.find(
        (item: ExamRow) =>
          item.exam.id === selectedExamId
      ) ?? null,
    [exams, selectedExamId]
  );

  const selectedSubjects = useMemo(
    () => selectedExam?.subjects ?? [],
    [selectedExam]
  );

  const selectedExamProgramme = useMemo(
    () =>
      programmes.find(
        (programme: Programme) =>
          programme.id === selectedExam?.exam.programmeId
      ) ?? null,
    [programmes, selectedExam]
  );

  const examSemesters = useMemo(
    () =>
      programmes.find(
        (programme: Programme) =>
          programme.id === examProgrammeId
      )?.semesters ?? [],
    [programmes, examProgrammeId]
  );

  const examBatches = useMemo(
    () => batches,
    [batches]
  );

  const selectedExamCourse = useMemo(
    () =>
      courses.find(
        (course: Course) =>
          course.id === selectedExam?.exam.courseId
      ) ?? null,
    [courses, selectedExam]
  );

  const selectedSubject = useMemo(() => {
    if (!selectedSubjectId) {
      return selectedSubjects[0] ?? null;
    }

    return (
      selectedSubjects.find(
        (subject: ExamSubject) =>
          subject.id === selectedSubjectId
      ) ??
      selectedSubjects[0] ??
      null
    );
  }, [
    selectedSubjectId,
    selectedSubjects,
  ]);

  const filteredStudents = useMemo(() => {
    const query =
      studentSearch.trim().toLowerCase();

    if (!query) {
      return students;
    }

    return students.filter(
      (student: Student) =>
        student.name
          .toLowerCase()
          .includes(query) ||
        student.studentId
          .toLowerCase()
          .includes(query)
    );
  }, [students, studentSearch]);

  const filteredMarksheetStudents =
    useMemo(() => {
      const query =
        marksheetSearch.trim().toLowerCase();

      if (!query) {
        return students;
      }

      return students.filter(
        (student: Student) =>
          student.name
            .toLowerCase()
            .includes(query) ||
          student.studentId
            .toLowerCase()
            .includes(query)
      );
    }, [
      marksheetSearch,
      students,
    ]);

  const marksheetStudent = useMemo(
    () =>
      students.find(
        (student: Student) =>
          student.id === marksheetStudentId
      ) ?? null,
    [students, marksheetStudentId]
  );

  const marksheetData =
    useMemo<MarksheetData | null>(() => {
      if (
        !selectedExam ||
        !marksheetStudent
      ) {
        return null;
      }

      const examSubjects =
        selectedExam.subjects ?? [];

      if (examSubjects.length === 0) {
        return null;
      }

      const subjectRows: MarksheetSubjectRow[] =
        examSubjects.map(
          (
            subject: ExamSubject
          ): MarksheetSubjectRow => {
            const matching =
              results.find(
                (row: ResultApiRow) =>
                  row.result?.studentId ===
                    marksheetStudent.id &&
                  row.result
                    ?.examSubjectId ===
                    subject.id
              );

            const rawMarks =
              matching?.result?.marks;

            const marks =
              rawMarks === null ||
              rawMarks === undefined ||
              rawMarks === ""
                ? null
                : Number(rawMarks);

            const validMarks =
              marks !== null &&
              Number.isFinite(marks) &&
              marks >= 0 &&
              marks <=
                Number(subject.totalMarks);

            const finalMarks =
              validMarks && marks !== null
                ? marks
                : null;

            const percentage =
              finalMarks !== null &&
              Number(subject.totalMarks) > 0
                ? (finalMarks /
                    Number(subject.totalMarks)) *
                  100
                : 0;

            const totalForSubject = Number(subject.totalMarks);
            const passMark = calculatePassMark(totalForSubject);
            const status: MarksheetSubjectRow["status"] =
              finalMarks === null
                ? "PENDING"
                : finalMarks >= totalForSubject * 0.33
                  ? "PASS"
                  : "FAIL";

            return {
              subject,
              marks: finalMarks,
              percentage,
              grade:
                finalMarks !== null
                  ? calculateGrade(
                      finalMarks,
                      totalForSubject
                    )
                  : "—",
              passMark,
              status,
              remarks:
                matching?.result
                  ?.remarks ?? "",
            };
          }
        );

      const completedRows =
        subjectRows.filter(
          (
            row: MarksheetSubjectRow
          ) => row.marks !== null
        );

      const totalMarks =
        examSubjects.reduce(
          (
            sum: number,
            subject: ExamSubject
          ) =>
            sum +
            Number(
              subject.totalMarks
            ),
          0
        );

      const obtainedMarks =
        completedRows.reduce(
          (
            sum: number,
            row: MarksheetSubjectRow
          ) =>
            sum +
            Number(row.marks ?? 0),
          0
        );

      const percentage =
        totalMarks > 0
          ? (obtainedMarks /
              totalMarks) *
            100
          : 0;

      const hasIncomplete =
        completedRows.length !==
        subjectRows.length;

      const hasFailed =
        completedRows.some(
          (
            row: MarksheetSubjectRow
          ) => row.grade === "F"
        );

      return {
        student: marksheetStudent,
        subjects: subjectRows,
        totalMarks,
        obtainedMarks,
        percentage,
        grade:
          hasIncomplete
            ? "—"
            : calculateOverallGrade(
                percentage
              ),
        result:
          hasIncomplete
            ? "INCOMPLETE"
            : hasFailed
              ? "FAIL"
              : "PASS",
      };
    }, [
      marksheetStudent,
      results,
      selectedExam,
    ]);

  const resultSummary = useMemo(() => {
    if (!selectedSubject) {
      return {
        total: students.length,
        entered: 0,
        passed: 0,
        failed: 0,
        average: 0,
      };
    }

    let entered = 0;
    let passed = 0;
    let failed = 0;
    let totalMarks = 0;

    for (const student of students) {
      const entry =
        markEntries[student.id];

      if (
        !entry ||
        entry.marks === ""
      ) {
        continue;
      }

      const marks = Number(entry.marks);

      if (
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks >
          Number(
            selectedSubject.totalMarks
          )
      ) {
        continue;
      }

      entered++;
      totalMarks += marks;

      const grade =
        calculateGrade(
          marks,
          Number(
            selectedSubject.totalMarks
          )
        );

      if (grade === "F") {
        failed++;
      } else {
        passed++;
      }
    }

    return {
      total: students.length,
      entered,
      passed,
      failed,
      average:
        entered > 0
          ? totalMarks / entered
          : 0,
    };
  }, [
    markEntries,
    selectedSubject,
    students,
  ]);

  useEffect(() => {
    void loadExams();
    void loadBatches();
    void loadProgrammes();
    void loadCourses();
  }, []);

  useEffect(() => {
    if (marksheetMode === "PROGRAMME" && marksheetProgrammeId) void loadProgrammeClasses(marksheetProgrammeId);
  }, [marksheetMode, marksheetProgrammeId]);

  useEffect(() => {
    if (marksheetMode === "COURSE" && marksheetCourseId) {
      void loadCourseClasses(marksheetCourseId);
    }
  }, [marksheetMode, marksheetCourseId]);

  useEffect(() => {
    if (marksheetMode === "PROGRAMME" && marksheetProgrammeId &&
        !marksheetProgrammeSemesters.some((semester) => semester.id === marksheetSemesterId)) {
      setMarksheetSemesterId(marksheetProgrammeSemesters[0]?.id ?? "");
    }
  }, [marksheetMode, marksheetProgrammeId, marksheetSemesterId, marksheetProgrammeSemesters]);

  useEffect(() => {
    const ready =
      marksheetMode === "COURSE"
        ? Boolean(marksheetCourseId)
        : Boolean(marksheetProgrammeId && marksheetSemesterId);

    if (!ready) return;

    const firstExam = marksheetTargetExams[0]?.exam.id ?? "";
    if (selectedExamId && marksheetTargetExams.some((item) => item.exam.id === selectedExamId)) return;
    if (firstExam) setSelectedExamId(firstExam);
  }, [
    marksheetMode,
    marksheetCourseId,
    marksheetProgrammeId,
    marksheetSemesterId,
    marksheetTargetExams,
    selectedExamId,
  ]);

  useEffect(() => {
    if (!selectedExam) {
      setStudents([]);
      setResults([]);
      setMarkEntries({});
      setSelectedSubjectId(null);
      setMarksheetStudentId(null);
      setShowMarksheet(false);
      return;
    }

    const firstSubject =
      selectedExam.subjects?.[0]?.id ??
      null;

    setSelectedSubjectId(
      (current: string | null) => {
        if (
          current &&
          selectedExam.subjects?.some(
            (subject: ExamSubject) =>
              subject.id === current
          )
        ) {
          return current;
        }

        return firstSubject;
      }
    );

    setMarksheetStudentId(null);
    setShowMarksheet(false);
    setMarksheetSearch("");
    setMarksheetMessage("");

    void loadStudentsForExam(
      selectedExam
    );

    void loadResultsForExam(
      selectedExam.exam.id
    );
  }, [selectedExam]);

  useEffect(() => {
    if (!selectedSubject) {
      setMarkEntries({});
      return;
    }

    buildMarkEntriesForSubject(
      selectedSubject
    );
  }, [
    selectedSubject,
    results,
    students,
  ]);

  async function loadExams() {
    setLoading(true);
    setPageError("");

    try {
      const response =
        await fetch("/api/exams", {
          cache: "no-store",
        });

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load exams."
        );
      }

      const rows =
        normalizeExamRows(
          data?.exams ?? data
        );

      setExams(rows);

      if (rows.length === 0) {
        setSelectedExamId(null);
      } else {
        setSelectedExamId(
          (
            current: string | null
          ) => {
            if (
              current &&
              rows.some(
                (item: ExamRow) =>
                  item.exam.id === current
              )
            ) {
              return current;
            }

            return rows[0].exam.id;
          }
        );
      }
    } catch (error) {
      console.error(error);

      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load exams."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadProgrammes() {
    try {
      const response = await fetch("/api/programmes", {
        cache: "no-store",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Failed to load programmes.");
      }

      const raw = Array.isArray(data?.programmes)
        ? data.programmes
        : Array.isArray(data)
          ? data
          : [];

      const normalized: Programme[] = raw
        .map((item: unknown): Programme | null => {
          if (!item || typeof item !== "object") return null;

          const source = item as Record<string, unknown>;
          const value =
            source.programme && typeof source.programme === "object"
              ? (source.programme as Record<string, unknown>)
              : source;

          if (typeof value.id !== "string" || typeof value.name !== "string") {
            return null;
          }

          const rawSemesters =
            Array.isArray(source.semesters)
              ? source.semesters
              : Array.isArray(value.semesters)
                ? value.semesters
                : [];

          const semesters = rawSemesters
            .map((semester: unknown): ProgrammeSemester | null => {
              if (!semester || typeof semester !== "object") return null;
              const row = semester as Record<string, unknown>;
              const nested =
                row.semester && typeof row.semester === "object"
                  ? (row.semester as Record<string, unknown>)
                  : row;
              if (typeof nested.id !== "string") return null;
              const semesterNo = Number(nested.semesterNo);
              if (!Number.isInteger(semesterNo) || semesterNo < 1) return null;
              return {
                id: nested.id,
                semesterNo,
                name:
                  typeof nested.name === "string"
                    ? nested.name
                    : `Semester ${semesterNo}`,
              };
            })
            .filter((semester: ProgrammeSemester | null): semester is ProgrammeSemester => semester !== null)
            .sort((a, b) => a.semesterNo - b.semesterNo);

          return {
            id: value.id,
            name: value.name,
            code: typeof value.code === "string" ? value.code : null,
            semesters,
          };
        })
        .filter((item: Programme | null): item is Programme => item !== null);

      setProgrammes(normalized);

      if (normalized.length > 0) {
        setExamProgrammeId((current) => current || normalized[0].id);
      }
    } catch (error) {
      console.error(error);
      setProgrammes([]);
    }
  }

  async function loadCourses() {
    try {
      const response = await fetch("/api/courses", { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load courses.");
      const raw = Array.isArray(data?.courses) ? data.courses : Array.isArray(data) ? data : [];
      const normalized = raw.map((item: unknown): Course | null => {
        if (!item || typeof item !== "object") return null;
        const source = item as Record<string, unknown>;
        const value = source.course && typeof source.course === "object" ? source.course as Record<string, unknown> : source;
        if (typeof value.id !== "string" || typeof value.name !== "string") return null;
        return { id: value.id, name: value.name, courseNo: typeof value.courseNo === "string" ? value.courseNo : null };
      }).filter((item: Course | null): item is Course => item !== null);
      setCourses(normalized);
      if (normalized.length > 0) setExamCourseId((current) => current || normalized[0].id);
    } catch (error) {
      console.error(error);
      setCourses([]);
    }
  }

  async function loadProgrammeClasses(programmeId: string) {
    setProgrammeClasses([]);
    if (!programmeId) return;
    try {
      const response = await fetch(`/api/attendance/options?programmeId=${encodeURIComponent(programmeId)}`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      const raw = response.ok && Array.isArray(data?.classes) ? data.classes : [];
      setProgrammeClasses(raw.filter((item: unknown): item is ProgrammeClass => Boolean(item && typeof item === "object" && typeof (item as Record<string, unknown>).id === "string" && typeof (item as Record<string, unknown>).title === "string")).map((item: ProgrammeClass) => ({ id: item.id, classNo: item.classNo == null ? null : Number(item.classNo), title: item.title, semesterId: typeof item.semesterId === "string" ? item.semesterId : null })));
    } catch { setProgrammeClasses([]); }
  }

  async function loadCourseClasses(courseId: string) {
    setCourseClasses([]);
    setExamCourseClassId("");
    if (!courseId) return;
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/classes`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error || "Failed to load course classes.");
      const raw = Array.isArray(data?.classes) ? data.classes : [];
      const normalized = raw.map((item: unknown): CourseClass | null => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        if (typeof row.id !== "string" || typeof row.title !== "string") return null;
        return { id: row.id, classNo: row.classNo == null ? null : Number(row.classNo), title: row.title, status: typeof row.status === "string" ? row.status : null };
      }).filter((item: CourseClass | null): item is CourseClass => item !== null);
      setCourseClasses(normalized);
      if (normalized.length > 0) setExamCourseClassId(normalized[0].id);
    } catch (error) {
      console.error(error);
      setCourseClasses([]);
    }
  }

  async function loadBatches() {
    setLoadingBatches(true);

    try {
      const response =
        await fetch("/api/batches", {
          cache: "no-store",
        });

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load batches."
        );
      }

      const rawBatches =
        Array.isArray(data?.batches)
          ? data.batches
          : Array.isArray(data)
            ? data
            : [];

      const normalized: Batch[] =
        rawBatches
          .map(
            (
              item: unknown
            ): Batch | null => {
              if (
                !item ||
                typeof item !== "object"
              ) {
                return null;
              }

              const source =
                item as Record<
                  string,
                  unknown
                >;

              const batchValue =
                source.batch &&
                typeof source.batch ===
                  "object"
                  ? source.batch
                  : source;

              if (
                !batchValue ||
                typeof batchValue !==
                  "object"
              ) {
                return null;
              }

              const batch =
                batchValue as Record<
                  string,
                  unknown
                >;

              if (
                typeof batch.id !==
                  "string" ||
                typeof batch.name !==
                  "string"
              ) {
                return null;
              }

              return {
                id: batch.id,
                name: batch.name,
                programmeId:
                  typeof batch.programmeId === "string"
                    ? batch.programmeId
                    : null,
                programmeName:
                  typeof source.programmeName === "string"
                    ? source.programmeName
                    : typeof batch.programmeName === "string"
                      ? batch.programmeName
                      : null,
                semesterId:
                  typeof batch.semesterId === "string"
                    ? batch.semesterId
                    : null,
                semesterName:
                  typeof source.semesterName === "string"
                    ? source.semesterName
                    : typeof batch.semesterName === "string"
                      ? batch.semesterName
                      : null,
              };
            }
          )
          .filter(
            (
              item: Batch | null
            ): item is Batch =>
              item !== null
          );

      setBatches(normalized);

      if (normalized.length > 0) {
        setExamBatchId(
          (
            current: string
          ) => {
            if (
              current &&
              normalized.some(
                (batch: Batch) =>
                  batch.id === current
              )
            ) {
              return current;
            }

            return normalized[0].id;
          }
        );
      }
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to load batches.",
      });
    } finally {
      setLoadingBatches(false);
    }
  }

  async function loadStudentsForExam(
    examRow: ExamRow
  ) {
    setLoadingStudents(true);

    try {
      if (examRow.mode === "COURSE" && examRow.exam.courseId) {
        const response = await fetch(
          `/api/exams/course-students?courseId=${encodeURIComponent(examRow.exam.courseId)}&courseClassId=${encodeURIComponent(examRow.exam.courseClassId || "")}`,
          { cache: "no-store" }
        );
        const data = await response.json().catch(() => null);
        if (!response.ok) throw new Error(data?.error || "Failed to load course students.");
        setStudents(normalizeStudents(data?.students ?? data));
        return;
      }

      const batch =
        batches.find(
          (item: Batch) =>
            item.id === examRow.exam.batchId
        ) ??
        batches.find(
          (item: Batch) =>
            item.name === examRow.batchName
        );

      let batchId =
        examRow.exam.batchId || batch?.id || "";

      if (!batchId) {
        const response =
          await fetch("/api/batches", {
            cache: "no-store",
          });

        const data =
          await response.json().catch(
            () => null
          );

        const rawBatches =
          Array.isArray(data?.batches)
            ? data.batches
            : Array.isArray(data)
              ? data
              : [];

        const matchingBatch =
          rawBatches.find(
            (item: unknown) => {
              if (
                !item ||
                typeof item !==
                  "object"
              ) {
                return false;
              }

              const source =
                item as Record<
                  string,
                  unknown
                >;

              const batchValue =
                source.batch &&
                typeof source.batch ===
                  "object"
                  ? source.batch
                  : source;

              if (
                !batchValue ||
                typeof batchValue !==
                  "object"
              ) {
                return false;
              }

              const row =
                batchValue as Record<
                  string,
                  unknown
                >;

              return (
                row.name ===
                examRow.batchName
              );
            }
          ) as
            | Record<string, unknown>
            | undefined;

        if (
          matchingBatch &&
          typeof matchingBatch.id ===
            "string"
        ) {
          batchId =
            matchingBatch.id;
        }
      }

      const response = await fetch(
        batchId
          ? `/api/students?batchId=${encodeURIComponent(batchId)}`
          : "/api/students",
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load students."
        );
      }

      setStudents(
        normalizeStudents(
          data?.students ?? data
        )
      );
    } catch (error) {
      console.error(error);

      setStudents([]);

      setResultMessage(
        error instanceof Error
          ? error.message
          : "Failed to load students."
      );
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadResultsForExam(
    examId: string
  ) {
    setLoadingResults(true);

    try {
      const response =
        await fetch(
          `/api/results?examId=${encodeURIComponent(
            examId
          )}&limit=${RESULT_PAGE_SIZE}`,
          {
            cache: "no-store",
          }
        );

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load results."
        );
      }

      setResults(
        normalizeResultRows(
          data?.results ?? data
        )
      );
    } catch (error) {
      console.error(error);

      setResults([]);

      setResultMessage(
        error instanceof Error
          ? error.message
          : "Failed to load results."
      );
    } finally {
      setLoadingResults(false);
    }
  }

  function buildMarkEntriesForSubject(
    subject: ExamSubject
  ) {
    const nextEntries: Record<
      string,
      MarkEntry
    > = {};

    for (const student of students) {
      const matching =
        results.find(
          (row: ResultApiRow) => {
            const result =
              row.result;

            return (
              result &&
              result.studentId ===
                student.id &&
              result.examSubjectId ===
                subject.id
            );
          }
        );

      const marks =
        matching?.result?.marks ===
          null ||
        matching?.result?.marks ===
          undefined
          ? ""
          : String(
              matching.result.marks
            );

      nextEntries[student.id] = {
        resultId:
          matching?.result?.id,
        marks,
        remarks:
          matching?.result
            ?.remarks ?? "",
      };
    }

    setMarkEntries(
      nextEntries
    );
  }

  function updateMarkEntry(
    studentId: string,
    field: keyof MarkEntry,
    value: string
  ) {
    setMarkEntries(
      (
        current: Record<
          string,
          MarkEntry
        >
      ) => ({
        ...current,
        [studentId]: {
          ...(current[studentId] ?? {
            marks: "",
            remarks: "",
          }),
          [field]: value,
        },
      })
    );
  }

  function resetExamForm() {
    setExamMode("BATCH");
    setExamProgrammeId("");
    setExamSemesterId("");
    setExamBatchId(batches[0]?.id ?? "");
    setExamCourseId(courses[0]?.id ?? "");
    setExamCourseClassId("");
    setCourseClasses([]);
    setExamName("");
    setExamDate("");
    setSubjects([{ ...EMPTY_SUBJECT }]);
  }

  function addSubject() {
    setSubjects(
      (
        current: Array<{
          subjectName: string;
          totalMarks: string;
        }>
      ) => [
        ...current,
        {
          subjectName: "",
          totalMarks: "100",
        },
      ]
    );
  }

  function removeSubject(
    index: number
  ) {
    setSubjects(
      (
        current: Array<{
          subjectName: string;
          totalMarks: string;
        }>
      ) => {
        if (current.length === 1) {
          return current;
        }

        return current.filter(
          (
            _: {
              subjectName: string;
              totalMarks: string;
            },
            itemIndex: number
          ) =>
            itemIndex !== index
        );
      }
    );
  }

  function updateSubject(
    index: number,
    field:
      | "subjectName"
      | "totalMarks",
    value: string
  ) {
    setSubjects(
      (
        current: Array<{
          subjectName: string;
          totalMarks: string;
        }>
      ) =>
        current.map(
          (
            subject: {
              subjectName: string;
              totalMarks: string;
            },
            itemIndex: number
          ) =>
            itemIndex === index
              ? {
                  ...subject,
                  [field]: value,
                }
              : subject
        )
    );
  }

  async function handleCreateExam(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setNotice(null);

    const trimmedName =
      examName.trim();

    if (examMode === "BATCH") {
      if (!examBatchId) {
        setNotice({
          type: "error",
          message: "Please select a batch.",
        });
        return;
      }
    } else if (examMode === "PROGRAMME") {
      if (!examProgrammeId) {
        setNotice({
          type: "error",
          message: "Please select a programme.",
        });
        return;
      }

      if (!examSemesterId) {
        setNotice({
          type: "error",
          message: "Please select a semester.",
        });
        return;
      }
    } else {
      if (!examCourseId) {
        setNotice({ type: "error", message: "Please select a course." });
        return;
      }
      if (!examCourseClassId) {
        setNotice({ type: "error", message: "Please select a course class." });
        return;
      }
    }

    if (!trimmedName) {
      setNotice({
        type: "error",
        message:
          "Please enter an exam name.",
      });
      return;
    }

    if (trimmedName.length > 255) {
      setNotice({
        type: "error",
        message:
          "Exam name is too long.",
      });
      return;
    }

    const preparedSubjects =
      subjects.map(
        (
          subject: {
            subjectName: string;
            totalMarks: string;
          }
        ) => ({
          subjectName:
            subject.subjectName.trim(),
          totalMarks:
            Number(
              subject.totalMarks
            ),
        })
      );

    if (
      preparedSubjects.length === 0
    ) {
      setNotice({
        type: "error",
        message:
          "Add at least one subject.",
      });
      return;
    }

    for (const subject of preparedSubjects) {
      if (!subject.subjectName) {
        setNotice({
          type: "error",
          message:
            "Every subject must have a name.",
        });
        return;
      }

      if (
        !Number.isInteger(
          subject.totalMarks
        ) ||
        subject.totalMarks <= 0
      ) {
        setNotice({
          type: "error",
          message:
            "Every subject must have a positive whole-number total mark.",
        });
        return;
      }
    }

    const subjectNames =
      preparedSubjects.map(
        (
          subject: {
            subjectName: string;
            totalMarks: number;
          }
        ) =>
          subject.subjectName.toLowerCase()
      );

    if (
      new Set(subjectNames).size !==
      subjectNames.length
    ) {
      setNotice({
        type: "error",
        message:
          "Duplicate subject names are not allowed.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const response =
        await fetch("/api/exams", {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            mode: examMode,
            programmeId:
              examMode === "PROGRAMME" ? examProgrammeId : null,
            semesterId:
              examMode === "PROGRAMME" ? examSemesterId : null,
            courseId:
              examMode === "COURSE" ? examCourseId : null,
            courseClassId:
              examMode === "COURSE" ? examCourseClassId : null,
            batchId:
              examMode === "BATCH" || examMode === "PROGRAMME"
                ? examBatchId || null
                : null,
            name: trimmedName,
            examDate:
              examDate || null,
            subjects:
              preparedSubjects,
          }),
        });

      const data =
        await response.json().catch(
          () => null
        );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create exam."
        );
      }

      setNotice({
        type: "success",
        message:
          data?.message ||
          "Exam created successfully.",
      });

      setShowModal(false);
      resetExamForm();

      await loadExams();
    } catch (error) {
      console.error(error);

      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to create exam.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveResults() {
    if (
      !selectedExam ||
      !selectedSubject
    ) {
      return;
    }

    setResultMessage("");
    setSavingResults(true);

    try {
      const records: ResultPayload[] =
        students
          .map(
            (
              student: Student
            ): ResultPayload | null => {
              const entry =
                markEntries[
                  student.id
                ];

              if (
                !entry ||
                entry.marks === ""
              ) {
                return null;
              }

              const marks =
                Number(entry.marks);

              if (
                !Number.isFinite(
                  marks
                ) ||
                marks < 0 ||
                marks >
                  Number(
                    selectedSubject.totalMarks
                  )
              ) {
                throw new Error(
                  `Invalid marks for ${student.name}. Marks must be between 0 and ${selectedSubject.totalMarks}.`
                );
              }

              const grade =
                calculateGrade(
                  marks,
                  Number(
                    selectedSubject.totalMarks
                  )
                );

              return {
                examId:
                  selectedExam.exam.id,
                examSubjectId:
                  selectedSubject.id,
                studentId:
                  student.id,
                marks,
                grade,
                remarks:
                  entry.remarks.trim() ||
                  null,
              };
            }
          )
          .filter(
            (
              item: ResultPayload | null
            ): item is ResultPayload =>
              item !== null
          );

      if (records.length === 0) {
        throw new Error(
          "Enter at least one student's marks before saving."
        );
      }

      const newResults =
        records.filter(
          (
            record: ResultPayload
          ) => {
            const existing =
              results.find(
                (
                  row: ResultApiRow
                ) =>
                  row.result?.studentId ===
                    record.studentId &&
                  row.result
                    ?.examSubjectId ===
                    record.examSubjectId
              );

            return !existing;
          }
        );

      const existingResults =
        records.filter(
          (
            record: ResultPayload
          ) => {
            const existing =
              results.find(
                (
                  row: ResultApiRow
                ) =>
                  row.result?.studentId ===
                    record.studentId &&
                  row.result
                    ?.examSubjectId ===
                    record.examSubjectId
              );

            return Boolean(
              existing?.result?.id
            );
          }
        );

      if (
        newResults.length > 0
      ) {
        const response =
          await fetch("/api/results", {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              results:
                newResults,
            }),
          });

        const data =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to save results."
          );
        }
      }

      for (
        const record of existingResults
      ) {
        const existing =
          results.find(
            (
              row: ResultApiRow
            ) =>
              row.result
                ?.studentId ===
                record.studentId &&
              row.result
                ?.examSubjectId ===
                record.examSubjectId
          );

        if (!existing?.result?.id) {
          continue;
        }

        const response =
          await fetch(
            "/api/results",
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                id:
                  existing.result.id,
                marks:
                  record.marks,
                remarks:
                  record.remarks,
              }),
            }
          );

        const data =
          await response
            .json()
            .catch(
              () => null
            );

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "Failed to update result."
          );
        }
      }

      await loadResultsForExam(
        selectedExam.exam.id
      );

      setResultMessage(
        "Results saved successfully."
      );
    } catch (error) {
      console.error(error);

      setResultMessage(
        error instanceof Error
          ? error.message
          : "Failed to save results."
      );
    } finally {
      setSavingResults(false);
    }
  }

  function openMarksheet(
    studentId?: string
  ) {
    const targetStudentId =
      studentId ??
      marksheetStudentId ??
      filteredMarksheetStudents[0]
        ?.id ??
      students[0]?.id ??
      null;

    if (!targetStudentId) {
      setMarksheetMessage(
        "No student is available for marksheet."
      );
      return;
    }

    setMarksheetStudentId(
      targetStudentId
    );
    setMarksheetMessage("");
    setMarksheetSearch("");
    setShowMarksheet(true);
  }

  function closeMarksheet() {
    setShowMarksheet(false);
    setMarksheetMessage("");
  }

  function printMarksheet() {
    if (
      !selectedExam ||
      !marksheetData
    ) {
      return;
    }

    window.print();
  }

  function formatDate(
    value:
      | string
      | null
      | undefined
  ) {
    if (!value) {
      return "No date";
    }

    const date = new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString();
  }

  const totalSubjects =
    exams.reduce(
      (
        sum: number,
        item: ExamRow
      ) =>
        sum +
        (item.subjects?.length ??
          0),
      0
    );

  const totalMarks =
    selectedExam
      ? selectedSubjects.reduce(
          (
            sum: number,
            subject: ExamSubject
          ) =>
            sum +
            Number(
              subject.totalMarks
            ),
          0
        )
      : 0;

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          .marksheet-print-area,
          .marksheet-print-area * {
            visibility: visible;
          }

                    .marksheet-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }

          .marksheet-print-area > div {
            width: 100% !important;
            max-width: none !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 8mm !important;
            box-shadow: none !important;
          }

          .marksheet-print-area img,
          .marksheet-print-area * {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .marksheet-no-print {
            display: none !important;
          }

          @page {
            size: A4 portrait;
            margin: 12mm;
          }
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Exams & Results
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Create exams, manage subjects,
              enter marks, maintain results
              and generate marksheets.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setNotice(null);
              resetExamForm();
              setShowModal(true);
            }}
            disabled={
              (examMode === "BATCH" && (loadingBatches || batches.length === 0)) ||
              (examMode === "PROGRAMME" && programmes.length === 0) ||
              (examMode === "COURSE" && courses.length === 0)
            }
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            + Create Exam
          </button>
        </div>

        {notice && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {notice.message}
          </div>
        )}

        {pageError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {pageError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Exams
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {exams.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Total Subjects
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalSubjects}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Students
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {students.length}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-gray-500">
              Exam Total Marks
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {totalMarks}
            </p>
          </div>
        </div>


        <section className="rounded-xl border border-purple-200 bg-white shadow-sm">
          <div className="border-b border-purple-100 bg-purple-50/60 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Marksheet Center</h2>
                <p className="mt-1 text-xs text-gray-600">Generate a student marksheet by Course or by Programme → Semester.</p>
              </div>
              <div className="flex rounded-lg border border-purple-200 bg-white p-1">
                <button type="button" onClick={() => { setMarksheetMode("COURSE"); setMarksheetCourseId(""); setMarksheetCourseClassId(""); setMarksheetStudentId(null); setShowMarksheet(false); }}
                  className={marksheetMode === "COURSE" ? "rounded-md bg-purple-600 px-3 py-2 text-xs font-semibold text-white" : "rounded-md px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-purple-50"}>
                  Course-wise
                </button>
                <button type="button" onClick={() => { setMarksheetMode("PROGRAMME"); setMarksheetProgrammeId(""); setMarksheetSemesterId(""); setMarksheetStudentId(null); setShowMarksheet(false); }}
                  className={marksheetMode === "PROGRAMME" ? "rounded-md bg-[#0f766e] px-3 py-2 text-xs font-semibold text-white" : "rounded-md px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-teal-50"}>
                  Programme Semester-wise
                </button>
              </div>
            </div>
          </div>
          <div className="p-5">
            {marksheetMode === "COURSE" ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Course</label>
                  <select value={marksheetCourseId} onChange={(event) => { setMarksheetCourseId(event.target.value); setMarksheetCourseClassId(""); setMarksheetStudentId(null); setShowMarksheet(false); }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100">
                    <option value="">Select course</option>
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.courseNo ? `${course.courseNo} — ` : ""}{course.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Course Class</label>
                  <select value={marksheetCourseClassId} onChange={(event) => { setMarksheetCourseClassId(event.target.value); setMarksheetStudentId(null); setShowMarksheet(false); }}
                    disabled={!marksheetCourseId}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100">
                    <option value="">All classes</option>
                    {exams.filter((item) => item.mode === "COURSE" && item.exam.courseId === marksheetCourseId)
                      .reduce<ExamRow[]>((unique, item) => {
                        const key = item.exam.courseClassId || item.courseClassTitle || item.exam.id;
                        if (!unique.some((x) => (x.exam.courseClassId || x.courseClassTitle || x.exam.id) === key)) unique.push(item);
                        return unique;
                      }, [])
                      .map((item) => <option key={item.exam.courseClassId || item.exam.id} value={item.exam.courseClassId || ""}>{item.courseClassNo ? "Class " + item.courseClassNo + " — " : ""}{item.courseClassTitle || "Course class"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Exam</label>
                  <select value={marksheetTargetExams.some((item) => item.exam.id === selectedExamId) ? selectedExamId ?? "" : ""}
                    onChange={(event) => { setSelectedExamId(event.target.value || null); setMarksheetStudentId(null); setShowMarksheet(false); }}
                    disabled={!marksheetCourseId || marksheetTargetExams.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 disabled:bg-gray-100">
                    <option value="">Select exam</option>
                    {marksheetTargetExams.map((item) => <option key={item.exam.id} value={item.exam.id}>{item.exam.name}{item.exam.examDate ? " — " + formatDate(item.exam.examDate) : ""}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Programme</label>
                  <select value={marksheetProgrammeId} onChange={(event) => { setMarksheetProgrammeId(event.target.value); setMarksheetSemesterId(""); setMarksheetStudentId(null); setShowMarksheet(false); }}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10">
                    <option value="">Select programme</option>
                    {programmes.map((programme) => <option key={programme.id} value={programme.id}>{programme.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Semester</label>
                  <select value={marksheetSemesterId} onChange={(event) => { setMarksheetSemesterId(event.target.value); setMarksheetStudentId(null); setShowMarksheet(false); }}
                    disabled={!marksheetProgrammeId}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10 disabled:bg-gray-100">
                    <option value="">Select semester</option>
                    {marksheetProgrammeSemesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Exam</label>
                  <select value={marksheetTargetExams.some((item) => item.exam.id === selectedExamId) ? selectedExamId ?? "" : ""}
                    onChange={(event) => { setSelectedExamId(event.target.value || null); setMarksheetStudentId(null); setShowMarksheet(false); }}
                    disabled={!marksheetProgrammeId || !marksheetSemesterId || marksheetTargetExams.length === 0}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10 disabled:bg-gray-100">
                    <option value="">Select exam</option>
                    {marksheetTargetExams.map((item) => <option key={item.exam.id} value={item.exam.id}>{item.exam.name}{item.exam.examDate ? " — " + formatDate(item.exam.examDate) : ""}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-dashed border-purple-200 bg-purple-50/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {selectedExam && marksheetTargetExams.some((item) => item.exam.id === selectedExam.exam.id) ? "Selected: " + selectedExam.exam.name : "Select the required Course/Programme, Semester and Exam"}
                </p>
                <p className="mt-1 text-xs text-gray-500">Then choose a student and print the official A4 marksheet.</p>
              </div>
              <button type="button" onClick={() => openMarksheet()}
                disabled={!selectedExam || !marksheetTargetExams.some((item) => item.exam.id === selectedExam.exam.id) || students.length === 0 || loadingStudents || loadingResults}
                className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300">
                📄 Open Marksheet
              </button>
            </div>
            {marksheetTargetExams.length === 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">No marksheet exam found for the selected filter. Create the exam and enter results first.</p>
            )}
            {selectedExam && marksheetTargetExams.some((item) => item.exam.id === selectedExam.exam.id) && loadingStudents && (
              <p className="mt-3 text-xs text-gray-500">Loading students for this marksheet…</p>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 px-5 py-4">
                <h2 className="font-semibold text-gray-900">
                  Exam List
                </h2>

                <p className="mt-1 text-xs text-gray-500">
                  Select an exam to manage
                  results and marksheets.
                </p>
              </div>

              <div className="p-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(
                      (item: number) => (
                        <div
                          key={item}
                          className="animate-pulse rounded-lg border border-gray-200 p-4"
                        >
                          <div className="h-4 w-2/3 rounded bg-gray-200" />
                          <div className="mt-3 h-3 w-1/2 rounded bg-gray-200" />
                        </div>
                      )
                    )}
                  </div>
                ) : exams.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 px-5 py-10 text-center">
                    <p className="font-medium text-gray-700">
                      No exams found
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      Create your first exam.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {exams.map(
                      (
                        item: ExamRow
                      ) => {
                        const isSelected =
                          item.exam.id ===
                          selectedExamId;

                        const subjectCount =
                          item.subjects
                            ?.length ?? 0;

                        return (
                          <button
                            key={
                              item.exam.id
                            }
                            type="button"
                            onClick={() =>
                              setSelectedExamId(
                                item.exam.id
                              )
                            }
                            className={`w-full rounded-lg border p-4 text-left transition ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                                : "border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <h3 className="truncate font-semibold text-gray-900">
                                  {
                                    item
                                      .exam
                                      .name
                                  }
                                </h3>
                                 {item.mode === "COURSE" ? (
                                   <>
                                     <p className="mt-1 text-sm font-medium text-blue-700">
                                       Course: {item.courseName || "Not set"}
                                     </p>
                                     <p className="mt-1 text-sm text-purple-700">
                                       Class: {item.courseClassNo ? `Class ${item.courseClassNo} — ` : ""}{item.courseClassTitle || "Not set"}
                                     </p>
                                   </>
                                 ) : item.mode === "PROGRAMME" ? (
                                   <>
                                     <p className="mt-1 text-sm font-medium text-[#0f766e]">
                                       Programme: {item.programmeName || "Not set"}
                                     </p>
                                     <p className="mt-1 text-sm text-[#b45309]">
                                       Semester: {item.semesterName || "Not set"}
                                     </p>
                                     {item.batchName && (
                                       <p className="mt-1 text-sm text-gray-600">
                                         Student Batch: {item.batchName}
                                       </p>
                                     )}
                                   </>
                                 ) : (
                                   <p className="mt-1 text-sm text-gray-600">
                                     Batch: {item.batchName}
                                   </p>
                                 )}
                              </div>

                              <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                                {
                                  subjectCount
                                }{" "}
                                {subjectCount ===
                                1
                                  ? "subject"
                                  : "subjects"}
                              </span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>
                                Date:{" "}
                                {formatDate(
                                  item.exam
                                    .examDate
                                )}
                              </span>

                              <span>
                                Created:{" "}
                                {formatDate(
                                  item.exam
                                    .createdAt
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            {!selectedExam ? (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <p className="font-medium text-gray-700">
                  Select an exam
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  Exam management will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-200 px-5 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                          Selected Exam
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-gray-900">
                          {
                            selectedExam
                              .exam
                              .name
                          }
                        </h2>
                         {selectedExam.mode === "COURSE" ? (
                           <>
                             <p className="mt-1 text-sm text-blue-700">
                               Course: {selectedExamCourse?.name || selectedExam.courseName || "Not set"}
                             </p>
                             <p className="mt-1 text-sm text-purple-700">
                               Class: {selectedExam.courseClassNo ? `Class ${selectedExam.courseClassNo} — ` : ""}{selectedExam.courseClassTitle || "Not set"}
                             </p>
                           </>
                         ) : selectedExam.mode === "PROGRAMME" ? (
                           <>
                             <p className="mt-1 text-sm text-gray-600">
                               Programme: {selectedExamProgramme?.name || selectedExam.programmeName || "Not set"}
                             </p>
                             <p className="mt-1 text-sm text-[#b45309]">
                               Semester: {selectedExam.semesterName || "Not set"}
                             </p>
                             {selectedExam.batchName && (
                               <p className="mt-1 text-sm text-gray-600">
                                 Student Batch: {selectedExam.batchName}
                               </p>
                             )}
                           </>
                         ) : (
                           <p className="mt-1 text-sm text-gray-600">
                             Batch: {selectedExam.batchName}
                           </p>
                         )}
                      </div>

                      <div className="rounded-lg bg-gray-50 px-4 py-3 text-right">
                        <p className="text-xs text-gray-500">
                          Exam Date
                        </p>

                        <p className="mt-1 font-semibold text-gray-900">
                          {formatDate(
                            selectedExam
                              .exam
                              .examDate
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Subjects
                        </h3>

                        <p className="mt-1 text-xs text-gray-500">
                          Select a subject for result entry.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {
                            selectedSubjects.length
                          }{" "}
                          subjects
                        </span>

                        {students.length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              openMarksheet()
                            }
                            className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
                          >
                            📄 Marksheet
                          </button>
                        )}
                      </div>
                    </div>

                    {selectedSubjects.length ===
                    0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
                        <p className="font-medium text-gray-700">
                          No subjects available
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {selectedSubjects.map(
                          (
                            subject: ExamSubject
                          ) => {
                            const active =
                              subject.id ===
                              selectedSubject
                                ?.id;

                            return (
                              <button
                                key={
                                  subject.id
                                }
                                type="button"
                                onClick={() => {
                                  setSelectedSubjectId(
                                    subject.id
                                  );
                                  setResultMessage(
                                    ""
                                  );
                                  setStudentSearch(
                                    ""
                                  );
                                }}
                                className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                                  active
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                                }`}
                              >
                                {
                                  subject.subjectName
                                }

                                <span
                                  className={`ml-2 text-xs ${
                                    active
                                      ? "text-blue-100"
                                      : "text-gray-400"
                                  }`}
                                >
                                  /{" "}
                                  {
                                    subject.totalMarks
                                  }
                                </span>
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedSubject && (
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-200 px-5 py-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              Result Entry
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              {
                                selectedSubject.subjectName
                              }{" "}
                              — Total Marks:{" "}
                              {
                                selectedSubject.totalMarks
                              }
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openMarksheet()
                              }
                              disabled={
                                students.length ===
                                0
                              }
                              className="rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              📄 View Marksheet
                            </button>

                            <button
                              type="button"
                              onClick={
                                saveResults
                              }
                              disabled={
                                savingResults ||
                                loadingStudents ||
                                loadingResults ||
                                students.length ===
                                  0
                              }
                              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                            >
                              {savingResults
                                ? "Saving..."
                                : "Save Results"}
                            </button>
                          </div>
                        </div>

                        {resultMessage && (
                          <div
                            className={`rounded-lg border px-3 py-2 text-sm ${
                              resultMessage
                                .toLowerCase()
                                .includes(
                                  "success"
                                )
                                ? "border-green-200 bg-green-50 text-green-800"
                                : "border-red-200 bg-red-50 text-red-800"
                            }`}
                          >
                            {
                              resultMessage
                            }
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Students
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {
                                resultSummary.total
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-gray-50 p-3">
                            <p className="text-xs text-gray-500">
                              Entered
                            </p>

                            <p className="mt-1 font-bold text-gray-900">
                              {
                                resultSummary.entered
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-green-50 p-3">
                            <p className="text-xs text-green-600">
                              Passed
                            </p>

                            <p className="mt-1 font-bold text-green-800">
                              {
                                resultSummary.passed
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-red-50 p-3">
                            <p className="text-xs text-red-600">
                              Failed
                            </p>

                            <p className="mt-1 font-bold text-red-800">
                              {
                                resultSummary.failed
                              }
                            </p>
                          </div>

                          <div className="rounded-lg bg-blue-50 p-3">
                            <p className="text-xs text-blue-600">
                              Average
                            </p>

                            <p className="mt-1 font-bold text-blue-800">
                              {resultSummary.average.toFixed(
                                2
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <input
                            type="text"
                            value={
                              studentSearch
                            }
                            onChange={(
                              event
                            ) =>
                              setStudentSearch(
                                event
                                  .target
                                  .value
                              )
                            }
                            placeholder="Search student..."
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:max-w-sm"
                          />

                          <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={
                                showRemarks
                              }
                              onChange={(
                                event
                              ) =>
                                setShowRemarks(
                                  event
                                    .target
                                    .checked
                                )
                              }
                              className="h-4 w-4 rounded border-gray-300"
                            />

                            Show remarks
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="p-5">
                      {loadingStudents ||
                      loadingResults ? (
                        <div className="space-y-3">
                          {[1, 2, 3, 4].map(
                            (
                              item: number
                            ) => (
                              <div
                                key={item}
                                className="animate-pulse rounded-lg border border-gray-200 p-4"
                              >
                                <div className="h-4 w-1/3 rounded bg-gray-200" />
                                <div className="mt-3 h-9 w-full rounded bg-gray-200" />
                              </div>
                            )
                          )}
                        </div>
                      ) : students.length ===
                        0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                          <p className="font-medium text-gray-700">
                            No students found
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            Students in this batch will appear here.
                          </p>
                        </div>
                      ) : filteredStudents.length ===
                        0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
                          <p className="font-medium text-gray-700">
                            No matching students
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Student
                                </th>

                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Marks /{" "}
                                  {
                                    selectedSubject.totalMarks
                                  }
                                </th>

                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Grade
                                </th>

                                {showRemarks && (
                                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                                    Remarks
                                  </th>
                                )}

                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  Marksheet
                                </th>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200 bg-white">
                              {filteredStudents.map(
                                (
                                  student: Student
                                ) => {
                                  const entry =
                                    markEntries[
                                      student.id
                                    ] ?? {
                                      marks:
                                        "",
                                      remarks:
                                        "",
                                    };

                                  const marks =
                                    entry.marks ===
                                    ""
                                      ? null
                                      : Number(
                                          entry.marks
                                        );

                                  const validMarks =
                                    marks !==
                                      null &&
                                    Number.isFinite(
                                      marks
                                    ) &&
                                    marks >= 0 &&
                                    marks <=
                                      Number(
                                        selectedSubject.totalMarks
                                      );

                                  const grade =
                                    validMarks &&
                                    marks !==
                                      null
                                      ? calculateGrade(
                                          marks,
                                          Number(
                                            selectedSubject.totalMarks
                                          )
                                        )
                                      : "";

                                  return (
                                    <tr
                                      key={
                                        student.id
                                      }
                                      className="hover:bg-gray-50"
                                    >
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                          <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                                            {student.photoUrl ? (
                                              <img
                                                src={
                                                  student.photoUrl
                                                }
                                                alt=""
                                                className="h-full w-full object-cover"
                                              />
                                            ) : (
                                              student.name
                                                .charAt(
                                                  0
                                                )
                                                .toUpperCase()
                                            )}
                                          </div>

                                          <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-gray-900">
                                              {
                                                student.name
                                              }
                                            </p>

                                            <p className="text-xs text-gray-500">
                                              {
                                                student.studentId
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      </td>

                                      <td className="px-4 py-3">
                                        <input
                                          type="number"
                                          min="0"
                                          max={
                                            selectedSubject.totalMarks
                                          }
                                          step="0.01"
                                          value={
                                            entry.marks
                                          }
                                          onChange={(
                                            event
                                          ) =>
                                            updateMarkEntry(
                                              student.id,
                                              "marks",
                                              event
                                                .target
                                                .value
                                            )
                                          }
                                          placeholder="0"
                                          className={`w-28 rounded-lg border px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
                                            entry.marks !==
                                              "" &&
                                            !validMarks
                                              ? "border-red-400 bg-red-50"
                                              : "border-gray-300"
                                          }`}
                                        />
                                      </td>

                                      <td className="px-4 py-3">
                                        {grade ? (
                                          <span
                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                              grade ===
                                              "F"
                                                ? "bg-red-100 text-red-700"
                                                : grade ===
                                                      "A+" ||
                                                    grade ===
                                                      "A"
                                                  ? "bg-green-100 text-green-700"
                                                  : "bg-blue-100 text-blue-700"
                                            }`}
                                          >
                                            {
                                              grade
                                            }
                                          </span>
                                        ) : (
                                          <span className="text-sm text-gray-400">
                                            —
                                          </span>
                                        )}
                                      </td>

                                      {showRemarks && (
                                        <td className="px-4 py-3">
                                          <input
                                            type="text"
                                            maxLength={
                                              2000
                                            }
                                            value={
                                              entry.remarks
                                            }
                                            onChange={(
                                              event
                                            ) =>
                                              updateMarkEntry(
                                                student.id,
                                                "remarks",
                                                event
                                                  .target
                                                  .value
                                              )
                                            }
                                            placeholder="Optional"
                                            className="w-full min-w-[180px] rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                          />
                                        </td>
                                      )}

                                      <td className="px-4 py-3 text-right">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            openMarksheet(
                                              student.id
                                            )
                                          }
                                          className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-semibold text-purple-700 transition hover:bg-purple-100"
                                        >
                                          View
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                }
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}

                      <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-800">
                        <strong>
                          Grade scale:
                        </strong>{" "}
                        A+ ≥ 80%, A ≥ 70%, A- ≥
                        60%, B ≥ 50%, C ≥ 40%, D ≥
                        33%, F &lt; 33%.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Create Exam
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Add exam details and subjects.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!submitting) {
                      setShowModal(
                        false
                      );
                    }
                  }}
                  className="rounded-lg px-3 py-2 text-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  handleCreateExam
                }
                className="space-y-5 p-5"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Exam Type
                    </label>
                    <select
                      value={examMode}
                      onChange={(event) => {
                        const value = event.target.value as ExamMode;
                        setExamMode(value);
                        if (value === "BATCH") {
                          setExamProgrammeId("");
                          setExamSemesterId("");
                          setExamCourseId("");
                          setExamCourseClassId("");
                          setCourseClasses([]);
                          setExamBatchId(batches[0]?.id ?? "");
                        } else if (value === "PROGRAMME") {
                          const firstProgramme = programmes[0];
                          setExamProgrammeId(firstProgramme?.id ?? "");
                          setExamSemesterId(firstProgramme?.semesters[0]?.id ?? "");
                          setExamCourseId("");
                          setExamCourseClassId("");
                          setCourseClasses([]);
                          setExamBatchId("");
                        } else {
                          setExamProgrammeId("");
                          setExamSemesterId("");
                          const firstCourse = courses[0];
                          setExamCourseId(firstCourse?.id ?? "");
                          setExamCourseClassId("");
                          setCourseClasses([]);
                          setExamBatchId("");
                          if (firstCourse?.id) void loadCourseClasses(firstCourse.id);
                        }
                      }}
                      disabled={submitting}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    >
                      <option value="BATCH">Batch Exam</option>
                      <option value="PROGRAMME">Programme Exam</option>
                      <option value="COURSE">Course Exam</option>
                    </select>
                  </div>

                  {examMode === "COURSE" ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Course</label>
                        <select
                          value={examCourseId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setExamCourseId(value);
                            void loadCourseClasses(value);
                          }}
                          disabled={submitting}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          <option value="">Select course</option>
                          {courses.map((course) => (
                            <option key={course.id} value={course.id}>
                              {course.courseNo ? `${course.courseNo} — ` : ""}{course.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">Course Class</label>
                        <select
                          value={examCourseClassId}
                          onChange={(event) => setExamCourseClassId(event.target.value)}
                          disabled={submitting || !examCourseId || courseClasses.length === 0}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          <option value="">Select course class</option>
                          {courseClasses.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.classNo ? `Class ${item.classNo} — ` : ""}{item.title}
                            </option>
                          ))}
                        </select>
                        {examCourseId && courseClasses.length === 0 && (
                          <p className="mt-1 text-xs text-amber-600">No course classes found. Create a class under Courses first.</p>
                        )}
                      </div>
                    </>
                  ) : examMode === "PROGRAMME" ? (
                    <>
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Programme
                        </label>
                        <select
                          value={examProgrammeId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setExamProgrammeId(value);
                            const firstSemester =
                              programmes.find((programme) => programme.id === value)?.semesters[0];
                            setExamSemesterId(firstSemester?.id ?? ""); setExamProgrammeClassId(""); void loadProgrammeClasses(value);
                          }}
                          disabled={submitting}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-[#0f766e]/10 disabled:bg-gray-100"
                        >
                          <option value="">Select programme</option>
                          {programmes.map((programme) => (
                            <option key={programme.id} value={programme.id}>
                              {programme.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Semester
                        </label>
                        <select
                          value={examSemesterId}
                          onChange={(event) => setExamSemesterId(event.target.value)}
                          disabled={submitting || !examProgrammeId}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#f59e0b] focus:ring-2 focus:ring-[#f59e0b]/10 disabled:bg-gray-100"
                        >
                          <option value="">Select semester</option>
                          {examSemesters.map((semester) => (
                            <option key={semester.id} value={semester.id}>
                              {semester.name}
                            </option>
                          ))}
                        </select>
                      </div>

                                             <div>
                         <label className="mb-1.5 block text-sm font-medium text-gray-700">Class</label>
                         <select value={examProgrammeClassId} onChange={(event) => setExamProgrammeClassId(event.target.value)} disabled={submitting || !examSemesterId} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#0f766e] disabled:bg-gray-100">
                           <option value="">Select class</option>
                           {programmeClasses.filter((item) => item.semesterId === examSemesterId).map((item) => <option key={item.id} value={item.id}>{item.classNo ? `Class ${item.classNo} — ` : ""}{item.title}</option>)}
                         </select>
                       </div>

<div>
                        <label className="mb-1.5 block text-sm font-medium text-gray-700">
                          Student Source Batch <span className="font-normal text-gray-400">(optional)</span>
                        </label>
                        <select
                          value={examBatchId}
                          onChange={(event) => setExamBatchId(event.target.value)}
                          disabled={loadingBatches || submitting}
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                        >
                          <option value="">All institute students</option>
                          {examBatches.map((batch) => (
                            <option key={batch.id} value={batch.id}>
                              {batch.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-gray-700">
                        Batch
                      </label>
                      <select
                        value={examBatchId}
                        onChange={(event) => setExamBatchId(event.target.value)}
                        disabled={loadingBatches || submitting}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                      >
                        <option value="">Select batch</option>
                        {examBatches.map((batch) => (
                          <option key={batch.id} value={batch.id}>
                            {batch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Exam Date
                    </label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(event) => setExamDate(event.target.value)}
                      disabled={submitting}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Exam Name
                  </label>

                  <input
                    type="text"
                    value={
                      examName
                    }
                    onChange={(
                      event
                    ) =>
                      setExamName(
                        event.target
                          .value
                      )
                    }
                    placeholder="e.g. Mid Term Examination"
                    maxLength={
                      255
                    }
                    disabled={
                      submitting
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Subjects
                      </h3>

                      <p className="mt-1 text-xs text-gray-500">
                        Add subject name and total marks.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        addSubject
                      }
                      disabled={
                        submitting
                      }
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add Subject
                    </button>
                  </div>

                  <div className="space-y-3">
                    {subjects.map(
                      (
                        subject: {
                          subjectName: string;
                          totalMarks: string;
                        },
                        index: number
                      ) => (
                        <div
                          key={index}
                          className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 sm:grid-cols-[1fr_140px_auto]"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Subject Name
                            </label>

                            <input
                              type="text"
                              value={
                                subject.subjectName
                              }
                              onChange={(
                                event
                              ) =>
                                updateSubject(
                                  index,
                                  "subjectName",
                                  event
                                    .target
                                    .value
                                )
                              }
                              placeholder="e.g. Mathematics"
                              maxLength={
                                255
                              }
                              disabled={
                                submitting
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-600">
                              Total Marks
                            </label>

                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={
                                subject.totalMarks
                              }
                              onChange={(
                                event
                              ) =>
                                updateSubject(
                                  index,
                                  "totalMarks",
                                  event
                                    .target
                                    .value
                                )
                              }
                              disabled={
                                submitting
                              }
                              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100"
                            />
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              onClick={() =>
                                removeSubject(
                                  index
                                )
                              }
                              disabled={
                                submitting ||
                                subjects.length ===
                                  1
                              }
                              className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setShowModal(
                        false
                      )
                    }
                    disabled={
                      submitting
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      submitting ||
                      loadingBatches ||
                      (examMode === "BATCH" && batches.length === 0) ||
                      (examMode === "PROGRAMME" && programmes.length === 0) ||
                      (examMode === "COURSE" && courses.length === 0)
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {submitting
                      ? "Creating..."
                      : "Create Exam"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showMarksheet && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4 sm:p-6">
            <div className="mx-auto w-full max-w-5xl">
              <div className="marksheet-no-print mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Student Marksheet
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    Select a student and print the official marksheet.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      printMarksheet
                    }
                    disabled={
                      !marksheetData
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    🖨 Print Marksheet
                  </button>

                  <button
                    type="button"
                    onClick={
                      closeMarksheet
                    }
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="marksheet-no-print mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
                <div className="grid gap-3 md:grid-cols-[1fr_280px]">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Student
                    </label>

                    <select
                      value={
                        marksheetStudentId ??
                        ""
                      }
                      onChange={(
                        event
                      ) => {
                        setMarksheetStudentId(
                          event.target
                            .value ||
                            null
                        );
                        setMarksheetMessage(
                          ""
                        );
                      }}
                      disabled={
                        marksheetLoading
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">
                        Select student
                      </option>

                      {filteredMarksheetStudents.map(
                        (
                          student: Student
                        ) => (
                          <option
                            key={
                              student.id
                            }
                            value={
                              student.id
                            }
                          >
                            {
                              student.name
                            }{" "}
                            —{" "}
                            {
                              student.studentId
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Search
                    </label>

                    <input
                      type="text"
                      value={
                        marksheetSearch
                      }
                      onChange={(
                        event
                      ) =>
                        setMarksheetSearch(
                          event
                            .target
                            .value
                        )
                      }
                      placeholder="Search student..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {marksheetSearch.trim() &&
                  filteredMarksheetStudents.length >
                    0 && (
                    <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-gray-200">
                      {filteredMarksheetStudents
                        .slice(0, 10)
                        .map(
                          (
                            student: Student
                          ) => (
                            <button
                              key={
                                student.id
                              }
                              type="button"
                              onClick={() => {
                                setMarksheetStudentId(
                                  student.id
                                );
                                setMarksheetSearch(
                                  ""
                                );
                                setMarksheetMessage(
                                  ""
                                );
                              }}
                              className={`flex w-full items-center justify-between border-b border-gray-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-blue-50 ${
                                student.id ===
                                marksheetStudentId
                                  ? "bg-blue-50"
                                  : ""
                              }`}
                            >
                              <span className="font-medium text-gray-800">
                                {
                                  student.name
                                }
                              </span>

                              <span className="text-xs text-gray-500">
                                {
                                  student.studentId
                                }
                              </span>
                            </button>
                          )
                        )}
                    </div>
                  )}

                {marksheetMessage && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                    {
                      marksheetMessage
                    }
                  </div>
                )}
              </div>

              {marksheetData &&
              selectedExam ? (
                <div className="marksheet-print-area overflow-hidden bg-white">
                  <div className="relative mx-auto min-h-[1050px] max-w-[794px] overflow-hidden bg-white px-8 py-8 sm:px-10 sm:py-10">
                    <div className="absolute left-0 right-0 top-0 h-2 bg-[#0f766e]" />
                    <div className="absolute left-0 top-2 h-1 w-1/3 bg-[#f59e0b]" />

                    <header className="border-b-2 border-[#0f766e] pb-5 text-center">
                      <div className="flex justify-center">
                        <img
                          src="/easylearn-logo.jpg"
                          alt="Easylearn Institute"
                          className="h-24 w-auto object-contain"
                        />
                      </div>

                      <h1 className="mt-2 text-xl font-extrabold tracking-wide text-[#0f766e] sm:text-2xl">
                        EASYLEARN INSTITUTE
                      </h1>

                      <p className="mx-auto mt-1 max-w-[650px] text-[11px] font-medium leading-5 text-gray-600 sm:text-xs">
                        Hazibag Dhla, Near Tazuddin Ahmed Medical Collage Hospital,
                        Joydebpur, Gazipur
                      </p>

                      <p className="mt-1 text-[11px] font-semibold text-[#f59e0b] sm:text-xs">
                        www.easylearninstitute.com
                      </p>

                      <div className="mx-auto mt-4 inline-flex items-center rounded-full border border-[#0f766e] bg-[#0f766e] px-7 py-2">
                        <span className="text-sm font-extrabold tracking-[0.22em] text-white sm:text-base">
                          MARKSHEET
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-bold text-gray-800">
                        {selectedExam.exam.name}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-full bg-[#f0fdfa] px-3 py-1 text-[10px] font-bold text-[#0f766e]">
                          Programme: {selectedExamProgramme?.name || selectedExam.programmeName || "Not set"}
                        </span>
                        <span className="rounded-full bg-[#fffbeb] px-3 py-1 text-[10px] font-bold text-[#b45309]">
                          Semester: {selectedExam.semesterName || "Not set"}
                        </span>
                      </div>

                      <p className="mt-1 text-[11px] text-gray-500">
                        Examination Date:{" "}
                        {formatDate(selectedExam.exam.examDate)}
                      </p>
                    </header>

                    <section className="mt-6 rounded-xl border border-[#0f766e]/30 bg-[#f0fdfa] p-4">
                      <div className="grid gap-5 sm:grid-cols-[1fr_105px]">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                              Student Name
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-gray-900">
                              {marksheetData.student.name}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                              Student ID
                            </p>
                            <p className="mt-1 text-sm font-extrabold text-gray-900">
                              {marksheetData.student.studentId}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                              Batch
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {selectedExam.batchName}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                              Programme
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {selectedExamProgramme?.name || selectedExam.programmeName || "—"}
                            </p>
                            <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.16em] text-[#b45309]">
                              Semester
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {selectedExam.semesterName || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                              Examination
                            </p>
                            <p className="mt-1 text-sm font-semibold text-gray-800">
                              {selectedExam.exam.name}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-center sm:justify-end">
                          <div className="h-24 w-24 overflow-hidden rounded-xl border-2 border-[#0f766e] bg-white p-1 shadow-sm">
                            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-[#f0fdfa]">
                              {marksheetData.student.photoUrl ? (
                                <img
                                  src={marksheetData.student.photoUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <span className="text-3xl font-extrabold text-[#0f766e]">
                                  {marksheetData.student.name.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </section>

                    <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3">
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gray-500">
                          Result Status
                        </p>
                        <p
                          className={`mt-1 text-base font-extrabold ${
                            marksheetData.result === "PASS"
                              ? "text-[#0f766e]"
                              : marksheetData.result === "FAIL"
                                ? "text-red-600"
                                : "text-[#f59e0b]"
                          }`}
                        >
                          {marksheetData.result}
                        </p>
                      </div>

                      <div
                        className={`rounded-full px-5 py-2 text-xs font-extrabold uppercase tracking-wider ${
                          marksheetData.result === "PASS"
                            ? "bg-[#0f766e] text-white"
                            : marksheetData.result === "FAIL"
                              ? "bg-red-600 text-white"
                              : "bg-[#f59e0b] text-white"
                        }`}
                      >
                        {marksheetData.result}
                      </div>
                    </div>

                    <section className="mt-5 overflow-hidden rounded-xl border-2 border-[#0f766e]">
                      <table className="min-w-full border-collapse">
                        <thead>
                          <tr>
                            <th className="border-r border-white/20 bg-[#0f766e] px-2 py-3 text-center text-[10px] font-extrabold !text-white">#</th>
                            <th className="border-r border-white/20 bg-[#0f766e] px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide !text-white">Subject</th>
                            <th className="border-r border-white/20 bg-[#0f766e] px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide !text-white">Total</th>
                            <th className="border-r border-[#92400e]/30 bg-[#d97706] px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide !text-white">Pass Mark</th>
                            <th className="border-r border-white/20 bg-[#0f766e] px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide !text-white">Obtained</th>
                            <th className="border-r border-white/20 bg-[#0f766e] px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide !text-white">%</th>
                            <th className="border-r border-white/20 bg-[#4338ca] px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide !text-white">Grade</th>
                            <th className="border-r border-white/20 bg-[#047857] px-3 py-3 text-center text-[10px] font-extrabold uppercase tracking-wide !text-white">Status</th>
                            <th className="bg-[#0f766e] px-3 py-3 text-left text-[10px] font-extrabold uppercase tracking-wide !text-white">Remarks</th>
                          </tr>
                        </thead>

                        <tbody>
                          {marksheetData.subjects.map(
                            (row: MarksheetSubjectRow, index: number) => (
                              <tr
                                key={row.subject.id}
                                className={index % 2 === 0 ? "bg-white" : "bg-[#f0fdfa]"}
                              >
                                <td className="border-b border-gray-200 px-2 py-3 text-center text-xs font-semibold text-gray-600">
                                  {index + 1}
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-xs font-bold text-gray-900">
                                  {row.subject.subjectName}
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-center text-xs font-semibold text-gray-700">
                                  {row.subject.totalMarks}
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-center text-xs font-bold text-[#b45309]">
                                  {row.passMark} <span className="text-[9px] font-semibold text-gray-500">(33%)</span>
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-center text-xs font-extrabold text-[#0f766e]">
                                  {row.marks === null ? "—" : row.marks}
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-center text-xs font-semibold text-gray-700">
                                  {row.marks === null ? "—" : `${row.percentage.toFixed(2)}%`}
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-center">
                                  <span
                                    className={`inline-flex min-w-9 justify-center rounded-full px-2 py-1 text-[10px] font-extrabold ${
                                      row.grade === "F"
                                        ? "bg-red-100 text-red-700"
                                        : row.grade === "—"
                                          ? "bg-gray-100 text-gray-500"
                                          : "bg-[#fef3c7] text-[#b45309]"
                                    }`}
                                  >
                                    {row.grade}
                                  </span>
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-center">
                                  <span
                                    className={`inline-flex min-w-14 justify-center rounded-full px-2 py-1 text-[10px] font-extrabold ${
                                      row.status === "PASS"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : row.status === "FAIL"
                                          ? "bg-red-100 text-red-700"
                                          : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {row.status}
                                  </span>
                                </td>
                                <td className="border-b border-gray-200 px-3 py-3 text-xs text-gray-600">
                                  {row.remarks || "—"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>

                        <tfoot>
                          <tr className="bg-[#f59e0b] text-white">
                            <td colSpan={2} className="px-3 py-3 text-right text-xs font-extrabold uppercase">
                              Total
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-extrabold">
                              {marksheetData.totalMarks}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-extrabold">
                              {marksheetData.subjects.reduce((sum, row) => sum + row.passMark, 0)}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-extrabold">
                              {marksheetData.obtainedMarks}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-extrabold">
                              {marksheetData.percentage.toFixed(2)}%
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-extrabold">
                              {marksheetData.grade}
                            </td>
                            <td className="px-3 py-3 text-center text-xs font-extrabold">
                              {marksheetData.result}
                            </td>
                            <td className="px-3 py-3 text-xs font-semibold">—</td>
                          </tr>
                        </tfoot>
                      </table>
                    </section>

                    <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-[#0f766e]/30 bg-[#f0fdfa] p-3 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#0f766e]">Total Marks</p>
                        <p className="mt-1 text-lg font-extrabold text-gray-900">{marksheetData.totalMarks}</p>
                      </div>

                      <div className="rounded-lg border border-[#0f766e]/30 bg-[#f0fdfa] p-3 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#0f766e]">Obtained</p>
                        <p className="mt-1 text-lg font-extrabold text-[#0f766e]">{marksheetData.obtainedMarks}</p>
                      </div>

                      <div className="rounded-lg border border-[#f59e0b]/40 bg-[#fffbeb] p-3 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#b45309]">Percentage</p>
                        <p className="mt-1 text-lg font-extrabold text-[#b45309]">{marksheetData.percentage.toFixed(2)}%</p>
                      </div>

                      <div className="rounded-lg border border-[#0f766e]/30 bg-[#f0fdfa] p-3 text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-[#0f766e]">Overall Grade</p>
                        <p className="mt-1 text-lg font-extrabold text-[#0f766e]">{marksheetData.grade}</p>
                      </div>
                    </section>

                    <div className="mt-5 rounded-lg border border-[#f59e0b]/40 bg-[#fffbeb] px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[#b45309]">
                        Grade Scale
                      </p>
                      <p className="mt-1 text-[10px] leading-5 text-gray-700">
                        A+ ≥ 80% &nbsp;•&nbsp; A ≥ 70% &nbsp;•&nbsp; A- ≥ 60% &nbsp;•&nbsp;
                        B ≥ 50% &nbsp;•&nbsp; C ≥ 40% &nbsp;•&nbsp; D ≥ 33% &nbsp;•&nbsp; F &lt; 33%
                      </p>
                    </div>

                    <section className="mt-14 grid grid-cols-3 gap-8">
                      <div className="pt-8 text-center">
                        <div className="border-t border-gray-500" />
                        <p className="mt-2 text-[10px] font-bold text-gray-700">Class Teacher</p>
                      </div>
                      <div className="pt-8 text-center">
                        <div className="border-t border-gray-500" />
                        <p className="mt-2 text-[10px] font-bold text-gray-700">Principal / Director</p>
                      </div>
                      <div className="pt-8 text-center">
                        <div className="border-t border-gray-500" />
                        <p className="mt-2 text-[10px] font-bold text-gray-700">Institute Seal</p>
                      </div>
                    </section>

                    <footer className="mt-8 border-t border-[#0f766e]/30 pt-3 text-center">
                      <p className="text-[9px] font-semibold text-[#0f766e]">
                        www.easylearninstitute.com
                      </p>
                      <p className="mt-1 text-[8px] text-gray-400">
                        Generated from Easylearn Institute LMS
                      </p>
                    </footer>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-lg">
                  <p className="font-semibold text-gray-700">
                    Select a student
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    The student's marksheet will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}