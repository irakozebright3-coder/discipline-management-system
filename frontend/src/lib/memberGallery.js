// Representative community members shown on the public site, one real generated
// portrait per member. Photos live in /public/images/members (served statically).
export const TRACKS = [
  { key: 'HIGH_SCHOOL', label: 'High School', path: 'high-school' },
  { key: 'UNIVERSITY', label: 'University', path: 'university' },
  { key: 'COMPANY', label: 'Company', path: 'company' },
  { key: 'ORGANIZATION', label: 'Organization', path: 'organization' },
  { key: 'COMMUNITY', label: 'Community', path: 'community' }
];

export const WELCOME_MEMBERS = [
  { id: 'hs-eric', name: 'Eric Uwase', track: 'HIGH_SCHOOL', role: 'Student — Senior 4', photo: '/images/members/hs-eric.jpg' },
  { id: 'hs-aline', name: 'Aline Ingabire', track: 'HIGH_SCHOOL', role: 'Student — Senior 3', photo: '/images/members/hs-aline.jpg' },
  { id: 'hs-patrick', name: 'Patrick Nsengimana', track: 'HIGH_SCHOOL', role: 'Student — Senior 6', photo: '/images/members/hs-patrick.jpg' },
  { id: 'hs-diane', name: 'Diane Mutoni', track: 'HIGH_SCHOOL', role: 'Student — Senior 5', photo: '/images/members/hs-diane.jpg' },
  { id: 'uni-emmanuel', name: 'Emmanuel Habimana', track: 'UNIVERSITY', role: 'Student — Computer Science, Year 2', photo: '/images/members/uni-emmanuel.jpg' },
  { id: 'uni-sandrine', name: 'Sandrine Umutoni', track: 'UNIVERSITY', role: 'Student — Law, Year 3', photo: '/images/members/uni-sandrine.jpg' },
  { id: 'uni-kevin', name: 'Kevin Nshimiyimana', track: 'UNIVERSITY', role: 'Student — Engineering, Year 4', photo: '/images/members/uni-kevin.jpg' },
  { id: 'uni-grace', name: 'Grace Mukamazimpaka', track: 'UNIVERSITY', role: 'Student — Economics, Year 1', photo: '/images/members/uni-grace.jpg' },
  { id: 'co-james', name: 'James Kagabo', track: 'COMPANY', role: 'Operations Manager', photo: '/images/members/co-james.jpg' },
  { id: 'co-claude', name: 'Claude Nyirahabimana', track: 'COMPANY', role: 'HR Lead', photo: '/images/members/co-claude.jpg' },
  { id: 'co-olivier', name: 'Olivier Rwema', track: 'COMPANY', role: 'Finance Director', photo: '/images/members/co-olivier.jpg' },
  { id: 'co-ingrid', name: 'Ingrid Kaliza', track: 'COMPANY', role: 'Project Coordinator', photo: '/images/members/co-ingrid.jpg' },
  { id: 'org-bella', name: 'Bella Uwase', track: 'ORGANIZATION', role: 'Program Officer', photo: '/images/members/org-bella.jpg' },
  { id: 'org-felix', name: 'Felix Habimana', track: 'ORGANIZATION', role: 'Field Coordinator', photo: '/images/members/org-felix.jpg' },
  { id: 'org-olivia', name: 'Olivia Mutoni', track: 'ORGANIZATION', role: 'Admin Officer', photo: '/images/members/org-olivia.jpg' },
  { id: 'org-mugisha', name: 'Mugisha Rutayisire', track: 'ORGANIZATION', role: 'Executive Director', photo: '/images/members/org-mugisha.jpg' },
  { id: 'com-elder', name: 'Abraham Muvunyi', track: 'COMMUNITY', role: 'Community Elder', photo: '/images/members/com-elder.jpg' },
  { id: 'com-mukamana', name: 'Josiane Mukamana', track: 'COMMUNITY', role: 'Community Member', photo: '/images/members/com-mukamana.jpg' },
  { id: 'com-thierry', name: 'Thierry Iradukunda', track: 'COMMUNITY', role: 'Youth Volunteer', photo: '/images/members/com-thierry.jpg' },
  { id: 'com-ange', name: 'Ange Umutoni', track: 'COMMUNITY', role: 'Community Coordinator', photo: '/images/members/com-ange.jpg' }
];

export const membersByTrack = (track) => WELCOME_MEMBERS.filter(m => m.track === track);
export const trackByPath = (path) => TRACKS.find(t => t.path === path);
