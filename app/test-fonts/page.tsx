'use client';

export default function TestFontsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 style={{ fontFamily: 'Victor Mono, Inter, system-ui, sans-serif' }}>Font Testing Page - This H1 should be Victor Mono</h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Heading Fonts (Victor Mono)</h2>

          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Title Fonts (Nunito Sans)</h2>

            <h3 className="text-xl font-heading mb-2">H3 with font-heading: Nunito Sans</h3>
            <h4 className="text-lg font-heading mb-2">H4 with font-heading: Nunito Sans</h4>
            <h5 className="text-base font-heading mb-2">H5 with font-heading: Nunito Sans</h5>
            <h6 className="text-sm font-heading mb-2">H6 with font-heading: Nunito Sans</h6>

            <div className="font-heading text-lg p-4 bg-muted rounded">
              Div with font-heading class: This should use Nunito Sans
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Body Text (Inter)</h2>

            <p className="text-lg mb-4 font-sans">
              This is body text using Inter font. It should be readable and clean.
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>

            <p className="text-base mb-4">
              Normal paragraph text. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Mono Font (JetBrains Mono)</h2>

            <code className="font-mono bg-muted p-4 rounded block text-sm">
              function helloWorld() {'{'}
              {'\n'}  console.log(&quot;Hello, World!&quot;);
              {'\n'}{'}'}
            </code>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Font Comparison</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded">
                <h3 className="font-sans text-lg mb-2">Inter (Sans)</h3>
                <p className="font-sans">The quick brown fox jumps over the lazy dog.</p>
              </div>

              <div className="p-4 border rounded">
                <h3 className="font-heading text-lg mb-2">Nunito Sans (Heading)</h3>
                <p className="font-heading">The quick brown fox jumps over the lazy dog.</p>
              </div>

              <div className="p-4 border rounded">
                <h3 className="text-victor-mono text-lg mb-2">Victor Mono (Hero)</h3>
                <p className="text-victor-mono">The quick brown fox jumps over the lazy dog.</p>
              </div>

              <div className="p-4 border rounded">
                <h3 className="font-mono text-lg mb-2">JetBrains Mono (Mono)</h3>
                <p className="font-mono">The quick brown fox jumps over the lazy dog.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
