/**
 * Location options
 * Defines supported city/suburb names and approximate suburb-centre coordinates for distance filtering.
 *
 * Note: See docs/CODE_GUIDE.md for file relationships and demo instructions.
 */
export const places: Record<string, {
    name: string;
    lat: number;
    lon: number;
}[]> = {
    'Brisbane': [
        { name: 'Brisbane City', lat: -27.4705, lon: 153.0260 }, { name: 'South Brisbane', lat: -27.4796, lon: 153.0179 },
        { name: 'West End', lat: -27.4831, lon: 153.0054 }, { name: 'New Farm', lat: -27.4696, lon: 153.0457 },
        { name: 'Fortitude Valley', lat: -27.4565, lon: 153.0345 }, { name: 'Toowong', lat: -27.4833, lon: 152.9932 },
        { name: 'Kelvin Grove', lat: -27.4481, lon: 153.0112 }, { name: 'Chermside', lat: -27.3851, lon: 153.0307 },
        { name: 'Nundah', lat: -27.4028, lon: 153.0610 }, { name: 'Sunnybank', lat: -27.5797, lon: 153.0592 },
        { name: 'Carindale', lat: -27.5052, lon: 153.1025 }, { name: 'Woolloongabba', lat: -27.4885, lon: 153.0353 },
        { name: 'St Lucia', lat: -27.4983, lon: 153.0046 }, { name: 'Indooroopilly', lat: -27.5016, lon: 152.9730 },
        { name: 'Paddington', lat: -27.4602, lon: 152.9985 }, { name: 'Ashgrove', lat: -27.4445, lon: 152.9915 },
        { name: 'Coorparoo', lat: -27.4932, lon: 153.0586 }, { name: 'Annerley', lat: -27.5123, lon: 153.0312 },
        { name: 'Mount Gravatt', lat: -27.5401, lon: 153.0781 }, { name: 'Morningside', lat: -27.4657, lon: 153.0742 }
    ],
    'Gold Coast': [{ name: 'Southport', lat: -27.9672, lon: 153.4145 }, { name: 'Surfers Paradise', lat: -28.0027, lon: 153.4298 }, { name: 'Robina', lat: -28.0720, lon: 153.3930 }],
    'Ipswich': [{ name: 'Ipswich', lat: -27.6146, lon: 152.7606 }, { name: 'Goodna', lat: -27.6095, lon: 152.8982 }, { name: 'Springfield Central', lat: -27.6797, lon: 152.8993 }]
};
export const categories = ['Litter', 'Illegal dumping', 'Plastic waste', 'Park cleanliness', 'Broken glass', 'Sharps / medical waste', 'Chemical / hazardous', 'Other'];

