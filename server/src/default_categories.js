export const DEFAULT_CATEGORIES = {
  HIGH_SCHOOL: [
    ['Late arrival', 'minor', 2], ['Absence without permission', 'moderate', 4], ['Uniform violation', 'minor', 2],
    ['Disrespect to staff or students', 'serious', 8], ['Classroom disruption', 'moderate', 3],
    ['Bullying or harassment', 'serious', 10], ['Dishonesty in exams or assignments', 'serious', 10],
    ['Damage to school property', 'serious', 6], ['Use of prohibited items', 'serious', 10],
    ['Skipping assigned duties', 'minor', 2]
  ],
  UNIVERSITY: [
    ['Late arrival', 'minor', 0], ['Absence without permission', 'moderate', 0], ['Exam misconduct', 'serious', 0],
    ['Plagiarism or academic dishonesty', 'serious', 0], ['Disrespect to staff or students', 'moderate', 0],
    ['Bullying or harassment', 'serious', 0], ['Property damage', 'serious', 0], ['Drug or alcohol violation', 'serious', 0]
  ],
  COMPANY: [
    ['Attendance violation', 'minor', 0], ['Policy violation', 'moderate', 0], ['Safety violation', 'serious', 0],
    ['Misconduct toward colleagues', 'serious', 0], ['Theft or fraud', 'serious', 0],
    ['Insubordination', 'moderate', 0], ['Data or confidentiality breach', 'serious', 0]
  ],
  ORGANIZATION: [
    ['Attendance violation', 'minor', 0], ['Policy violation', 'moderate', 0], ['Misconduct toward members', 'serious', 0],
    ['Misuse of resources', 'moderate', 0], ['Theft or fraud', 'serious', 0]
  ],
  COMMUNITY: [
    ['Code of conduct violation', 'minor', 0], ['Harassment of members', 'serious', 0],
    ['Disruption of community activities', 'moderate', 0], ['Misuse of community resources', 'moderate', 0]
  ]
};
