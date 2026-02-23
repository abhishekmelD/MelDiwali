export interface Event {
    id: string;
    title: string;
    date: string; // Display date, e.g., "11 Oct"
    isoDate: string; // ISO date for calendar logic, e.g., "2026-10-11"
    location: string;
    description: string;
}

export const EVENTS: Event[] = [
    {
        id: 'p1',
        title: 'Diwali Lights 2025',
        date: '20 Oct 2025',
        isoDate: '2025-10-20',
        location: 'Melbourne CBD',
        description: 'Past celebration of lights.'
    },
    {
        id: 'p2',
        title: 'Cultural Dance 2025',
        date: '25 Oct 2025',
        isoDate: '2025-10-25',
        location: 'Federation Square',
        description: 'Traditional dance performances.'
    },
    {
        id: '1',
        title: 'Melbourne Diwali 2026',
        date: '11 Oct',
        isoDate: '2026-10-11',
        location: 'Melbourne',
        description: 'The biggest Diwali festival in Melbourne.'
    },
    {
        id: '2',
        title: 'Diya Painting Workshop',
        date: '15 Oct',
        isoDate: '2026-10-15',
        location: 'Melbourne CBD',
        description: 'Learn to paint traditional earthen lamps.'
    },
    {
        id: '3',
        title: 'Garba Night',
        date: '25 Oct',
        isoDate: '2026-10-25',
        location: 'Melbourne CBD',
        description: 'Dance the night away with traditional Garba beats.'
    },
    {
        id: '4',
        title: 'Rangoli Competition',
        date: '31 Oct',
        isoDate: '2026-10-31',
        location: 'Federation Square',
        description: 'Showcase your artistic skills in our annual Rangoli contest.'
    },
];
