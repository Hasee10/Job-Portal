import { Document, Font, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { TailoredResumeContent } from '@/lib/jobs/tailored-resume-types';

// The base-14 "Times-Roman"/"Times-Bold" aliases aren't real embedded fonts -
// react-pdf asks whatever PDF viewer opens the file to substitute its own
// serif font and line metrics, which is why the same PDF looked tight in one
// viewer and had huge gaps between wrapped bullet lines in another. Tinos is
// a metric-compatible open-source match for Times New Roman; registering and
// embedding it directly makes line spacing identical in every viewer.
// react-pdf's font loader requires an absolute URL (it checks with is-url,
// which a root-relative path fails) - this only ever runs client-side (this
// component is rendered inside a pdf()/toBlob() call from a click handler),
// so window.location.origin is always available by the time it matters.
const fontBaseUrl = typeof window === 'undefined' ? '' : window.location.origin;
Font.register({
  family: 'Tinos',
  fonts: [
    { src: `${fontBaseUrl}/fonts/Tinos-Regular.ttf` },
    { src: `${fontBaseUrl}/fonts/Tinos-Bold.ttf`, fontWeight: 'bold' },
    { src: `${fontBaseUrl}/fonts/Tinos-Italic.ttf`, fontStyle: 'italic' },
    { src: `${fontBaseUrl}/fonts/Tinos-BoldItalic.ttf`, fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// PDF version of the same Harvard-style layout as HarvardResumePreview.tsx.
const styles = StyleSheet.create({
  page: {
    paddingVertical: 20,
    paddingHorizontal: 50,
    fontSize: 9.3,
    fontFamily: 'Tinos',
    color: '#18181b',
  },
  header: { textAlign: 'center', marginBottom: 6 },
  name: { fontSize: 14.5, fontWeight: 'bold', letterSpacing: 1 },
  contact: { fontSize: 8.3, color: '#52525b', marginTop: 2 },
  headline: { fontSize: 9.3, fontStyle: 'italic', marginTop: 2 },
  summary: { marginBottom: 5, lineHeight: 1.1 },
  section: { marginBottom: 5 },
  sectionTitle: {
    fontSize: 9.3,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#a1a1aa',
    paddingBottom: 2,
    marginBottom: 3,
  },
  entry: { marginBottom: 3 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  entryTitle: { fontWeight: 'bold' },
  entryDates: { fontSize: 8.3, color: '#52525b' },
  bullet: { flexDirection: 'row', marginTop: 0, paddingLeft: 9 },
  bulletDot: { width: 9, lineHeight: 1.12 },
  bulletText: { flex: 1, lineHeight: 1.12 },
  eduRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  skills: { lineHeight: 1.15 },
});

export function HarvardResumePdf({ resume }: { resume: TailoredResumeContent }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{(resume.fullName || 'Your Name').toUpperCase()}</Text>
          {resume.contact ? <Text style={styles.contact}>{resume.contact}</Text> : null}
          {resume.headline ? <Text style={styles.headline}>{resume.headline}</Text> : null}
        </View>

        {resume.summary ? <Text style={styles.summary}>{resume.summary}</Text> : null}

        {resume.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            {resume.experience.map((entry, i) => (
              <View key={i} style={styles.entry} minPresenceAhead={40}>
                <View style={styles.entryRow} wrap={false}>
                  <Text style={styles.entryTitle}>
                    {entry.title}
                    {entry.company ? `, ${entry.company}` : ''}
                  </Text>
                  <Text style={styles.entryDates}>{entry.dates}</Text>
                </View>
                {entry.bullets
                  .filter((bullet) => bullet.trim().length > 0)
                  .map((bullet, j) => (
                    // wrap=false keeps a single bullet's dot+text together on one
                    // page - without it, react-pdf can split a wrapped Text mid-line
                    // across the page boundary, leaving a large blank gap where the
                    // rest of the row was pushed to the next page.
                    <View key={j} style={styles.bullet} wrap={false}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
              </View>
            ))}
          </View>
        )}

        {resume.education.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Education</Text>
            {resume.education.map((entry, i) => (
              <View key={i} style={styles.eduRow}>
                <Text>
                  {entry.degree}
                  {entry.school ? `, ${entry.school}` : ''}
                </Text>
                <Text style={styles.entryDates}>{entry.year}</Text>
              </View>
            ))}
          </View>
        )}

        {resume.skills.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skills}>{resume.skills.join(' · ')}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
