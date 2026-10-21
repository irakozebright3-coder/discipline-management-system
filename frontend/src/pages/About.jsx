import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.jsx';
import { getCreatorProfile } from '../lib/api.js';

export default function About() {
  const [creator, setCreator] = useState(null);
  useEffect(() => { getCreatorProfile().then(({ data }) => setCreator(data)).catch(() => {}); }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-12">
      <h1 className="text-3xl font-bold">About Discipline Management</h1>
      <Card>
        <CardHeader><CardTitle>Our mission</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Every institution deserves transparent, fair discipline management. Discipline Management records conduct incidents, deducts marks consistently, and keeps a full audit trail — so decisions about students, employees, and members are based on facts, not memory.</p>
        </CardContent>
      </Card>
      {creator && (
        <Card>
          <CardHeader><CardTitle>{creator.full_name}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{creator.title}</p>
            <p className="mt-2">{creator.biography}</p>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Supported tracks</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-muted-foreground">
            <li>High School — classes, trades, term marks out of 40, guardians</li>
            <li>University — faculties, departments, programs, years of study</li>
            <li>Company — departments, offices, roles</li>
            <li>Organization — departments, offices, roles</li>
            <li>Community — roles and cohorts</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
