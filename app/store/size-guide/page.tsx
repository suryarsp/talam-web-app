const SIZE_ROWS = [
  { size: 'S', bust: '34"', waist: '28"', hip: '37"' },
  { size: 'M', bust: '36"', waist: '30"', hip: '39"' },
  { size: 'L', bust: '38"', waist: '32"', hip: '41"' },
  { size: 'XL', bust: '40"', waist: '34"', hip: '43"' },
  { size: 'XXL', bust: '42"', waist: '36"', hip: '45"' },
]

export default function SizeGuidePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-16 sm:py-12">
      <div>
        <h1 className="mb-2 font-heading text-2xl font-bold text-fg sm:text-3xl">Size guide</h1>
        <p className="font-body text-sm text-muted-warm">
          A general size chart to help you find your fit. For garment-specific sizing, check the product page.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left font-body text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="p-4 font-bold text-fg">Size</th>
              <th className="p-4 font-bold text-fg">Bust</th>
              <th className="p-4 font-bold text-fg">Waist</th>
              <th className="p-4 font-bold text-fg">Hip</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {SIZE_ROWS.map((row) => (
              <tr key={row.size}>
                <td className="p-4 font-bold text-fg">{row.size}</td>
                <td className="p-4 text-muted-warm">{row.bust}</td>
                <td className="p-4 text-muted-warm">{row.waist}</td>
                <td className="p-4 text-muted-warm">{row.hip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="font-body text-sm leading-[150%] text-muted-warm">
        Measurements are in inches and taken at the widest point of each area. If you&apos;re between sizes, we
        recommend sizing up for a more comfortable fit.
      </p>
    </main>
  )
}
