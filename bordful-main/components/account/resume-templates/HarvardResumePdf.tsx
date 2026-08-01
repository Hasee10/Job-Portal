import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { TailoredResumeContent } from '@/lib/jobs/tailored-resume-types';

// PDF version of the same Harvard-style layout as HarvardResumePreview.tsx.
const styles = StyleSheet.create({
  page: {
    paddingVertical: 48,
    paddingHorizontal: 56,
    fontSize: 10.5,
    fontFamily: 'Times-Roman',
    color: '#18181b',
  },
  header: { textAlign: 'center', marginBottom: 16 },
  name: { fontSize: 16, fontFamily: 'Times-Bold', letterSpacing: 1 },
  contact: { fontSize: 9, color: '#52525b', marginTop: 3 },
  headline: { fontSize: 10.5, fontStyle: 'italic', marginTop: 3 },
  summary: { marginBottom: 14, lineHeight: 1.4 },
  section: { marginBottom: 14 },
  sectionTitle: {
    fontSize: 10.5,
    fontFamily: 'Times-Bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
    borderBottomWidth: 1,
    borderBottomColor: '#a1a1aa',
    paddingBottom: 3,
    marginBottom: 6,
  },
  entry: { marginBottom: 8 },
  entryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  entryTitle: { fontFamily: 'Times-Bold' },
  entryDates: { fontSize: 9, color: '#52525b' },
  bullet: { flexDirection: 'row', marginTop: 2, paddingLeft: 10 },
  bulletDot: { width: 10, lineHeight: 1.35 },
  bulletText: { flex: 1, lineHeight: 1.35 },
  eduRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  skills: { lineHeight: 1.4 },
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
          <View style={styles.section}>
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text style={styles.skills}>{resume.skills.join(' · ')}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
