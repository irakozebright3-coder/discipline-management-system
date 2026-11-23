// Hero slideshow photos (one per institution track). They crossfade behind the headline.
// To change them: put images in frontend/public/hero/ and edit this list.
//   src   – image path        label – shown as the small caption     focus – which part to keep when the photo is cropped
export const HERO_SLIDES = [
  { src: '/hero/high-school.jpg',  label: 'High Schools',   focus: '50% 78%' },
  { src: '/hero/university.jpg',   label: 'Universities',   focus: '50% 62%' },
  { src: '/hero/company.jpg',      label: 'Companies',      focus: '50% 58%' },
  { src: '/hero/organization.jpg', label: 'Organizations',  focus: '50% 55%' },
  { src: '/hero/community.jpg',    label: 'Communities',    focus: '50% 62%' }
];
