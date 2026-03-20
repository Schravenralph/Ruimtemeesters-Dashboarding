import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { DataPoint } from '@shared/api/contracts';

interface PopulationPyramidProps {
  data: DataPoint[];
}

/**
 * Population pyramid chart — a classic demographic visualization.
 * Shows age distribution by gender with opposing horizontal bars.
 */
export function PopulationPyramidComponent({ data }: PopulationPyramidProps) {
  // Filter data that has both age_group and gender dimensions
  const maleData = data.filter(d => d.dimensionValue === 'man');
  const femaleData = data.filter(d => d.dimensionValue === 'vrouw');

  if (maleData.length === 0 && femaleData.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">Geen bevolkingspyramide data beschikbaar</p>;
  }

  // Get unique age groups
  const ageGroups = [...new Set([...maleData, ...femaleData].map(d => {
    // Try to find age group from the dimension or from another field
    const point = data.find(p => p.value === d.value && p.dimensionValue === d.dimensionValue);
    return point?.label || point?.geoName || d.dimensionValue || 'Onbekend';
  }))];

  // Build pyramid data: male values are negative for left-side display
  const ageGroupLabels = ['0-14', '15-24', '25-44', '45-64', '65-79', '80+'];
  const pyramidData = ageGroupLabels.map(ag => {
    const male = maleData.find(d => d.label === ag || d.geoName === ag)?.value || 0;
    const female = femaleData.find(d => d.label === ag || d.geoName === ag)?.value || 0;

    return {
      ageGroup: ag,
      male: -male, // Negative for left side
      female: female,
      maleAbs: male,
    };
  });

  // If no structured data, create simple two-bar comparison
  if (pyramidData.every(d => d.maleAbs === 0 && d.female === 0)) {
    // Fallback: show aggregated male vs female
    const totalMale = maleData.reduce((sum, d) => sum + d.value, 0);
    const totalFemale = femaleData.reduce((sum, d) => sum + d.value, 0);

    return (
      <div className="flex items-center justify-center gap-8 py-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{totalMale.toLocaleString('nl-NL')}</div>
          <div className="text-sm text-gray-500 mt-1">Man</div>
        </div>
        <div className="h-16 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-3xl font-bold text-pink-600">{totalFemale.toLocaleString('nl-NL')}</div>
          <div className="text-sm text-gray-500 mt-1">Vrouw</div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...pyramidData.map(d => Math.abs(d.male)),
    ...pyramidData.map(d => d.female),
  );

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={pyramidData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 30, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          type="number"
          domain={[-maxValue * 1.1, maxValue * 1.1]}
          tickFormatter={(value: number) => Math.abs(value).toLocaleString('nl-NL')}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          type="category"
          dataKey="ageGroup"
          tick={{ fontSize: 12 }}
          width={50}
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            Math.abs(value).toLocaleString('nl-NL'),
            name === 'male' ? 'Man' : 'Vrouw',
          ]}
        />
        <Legend formatter={(value) => value === 'male' ? 'Man' : 'Vrouw'} />
        <ReferenceLine x={0} stroke="#e5e7eb" />
        <Bar dataKey="male" fill="#3b82f6" name="male" />
        <Bar dataKey="female" fill="#ec4899" name="female" />
      </BarChart>
    </ResponsiveContainer>
  );
}
