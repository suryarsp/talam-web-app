const FAQS = [
  {
    q: 'How long does delivery take?',
    a: 'Most orders are dispatched within 5-7 business days and delivered shortly after, depending on your location.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept UPI, major debit/credit cards, and cash on delivery where available.',
  },
  {
    q: 'Can I return or exchange an item?',
    a: 'Yes — see our Returns & Exchange page for the return window and how to start a return.',
  },
  {
    q: 'How do I track my order?',
    a: 'Once your order ships, you can track its status from the Orders section of your account.',
  },
  {
    q: 'Do you offer free delivery?',
    a: 'Free delivery is available above a minimum order value where noted at checkout.',
  },
]

export default function FaqsPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-16 sm:py-12">
      <div>
        <h1 className="mb-2 font-heading text-2xl font-bold text-fg sm:text-3xl">Frequently asked questions</h1>
        <p className="font-body text-sm text-muted-warm">Answers to the questions we hear most often.</p>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border">
        {FAQS.map((faq) => (
          <div key={faq.q} className="p-6">
            <p className="mb-1.5 font-body text-sm font-bold text-fg">{faq.q}</p>
            <p className="font-body text-sm leading-[150%] text-muted-warm">{faq.a}</p>
          </div>
        ))}
      </div>
    </main>
  )
}
