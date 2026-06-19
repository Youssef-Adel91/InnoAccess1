import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Link,
} from '@react-pdf/renderer';
import type { ResumeDraft } from '@/store/useResumeStore';
import { registerResumeFonts } from './pdfFonts';

// ─── Font Registration ────────────────────────────────────────────────────────
// Called at module load time. The guard inside registerResumeFonts() makes
// this idempotent — safe to call from both PreviewStep (client) and the
// export-pdf API route (server).
registerResumeFonts();

// ─── Section labels (bilingual) ───────────────────────────────────────────────

const LABELS = {
    summary:          { ltr: 'Professional Summary', rtl: 'الملخص المهني'   },
    experience:       { ltr: 'Work Experience',       rtl: 'الخبرة العملية'   },
    education:        { ltr: 'Education',             rtl: 'التعليم'          },
    skills:           { ltr: 'Skills',                rtl: 'المهارات'         },
    certifications:   { ltr: 'Certifications',        rtl: 'الشهادات'         },
    languages:        { ltr: 'Languages',             rtl: 'اللغات'           },
    present:          { ltr: 'Present',               rtl: 'الآن'             },
    grade:            { ltr: 'Grade',                 rtl: 'التقدير'          },
} as const;

type LabelKey = keyof typeof LABELS;

// ─── Style factory ────────────────────────────────────────────────────────────
// All styles are computed once per render based on document direction.
// RTL layout is achieved via:
//   • textAlign: 'right'                  — text alignment
//   • flexDirection: 'row-reverse'        — horizontal stacking
//   • Swapped padding/margin left ↔ right — section gutters

const createStyles = (direction: 'ltr' | 'rtl') => {
    const isRtl      = direction === 'rtl';
    const fontFamily = isRtl ? 'Amiri' : 'Inter';
    const textAlign  = isRtl ? ('right' as const) : ('left' as const);

    return StyleSheet.create({
        // ── Page ─────────────────────────────────────────────────────────────
        page: {
            paddingTop:    45,
            paddingBottom: 45,
            paddingLeft:   45,
            paddingRight:  45,
            fontFamily,
            fontSize:      10.5,
            color:         '#1a1a1a',
            lineHeight:    1.55,
            backgroundColor: '#ffffff',
        },

        // ── Header ────────────────────────────────────────────────────────────
        header: {
            marginBottom:    22,
            paddingBottom:   16,
            borderBottomWidth: 2,
            borderBottomColor: '#2563eb',
            borderBottomStyle: 'solid',
            alignItems:      'center',
        },
        name: {
            fontSize:    26,
            fontWeight:  'bold',
            color:       '#111827',
            marginBottom: 6,
            textAlign:   'center',
            letterSpacing: 0.5,
        },
        contactRow: {
            flexDirection:  isRtl ? 'row-reverse' : 'row',
            justifyContent: 'center',
            flexWrap:       'wrap',
            fontSize:       9.5,
            color:          '#4b5563',
        },
        contactSep: {
            marginHorizontal: 6,
            color:            '#9ca3af',
        },
        link: {
            color:          '#2563eb',
            textDecoration: 'none',
        },

        // ── Sections ──────────────────────────────────────────────────────────
        section: {
            marginBottom: 14,
        },
        sectionTitle: {
            fontSize:          10,
            fontWeight:        'bold',
            color:             '#2563eb',
            textTransform:     'uppercase',
            letterSpacing:     1.2,
            marginBottom:      7,
            paddingBottom:     4,
            borderBottomWidth: 1,
            borderBottomColor: '#e5e7eb',
            borderBottomStyle: 'solid',
            textAlign,
        },

        // ── Entry blocks (experience, education, certifications) ──────────────
        entryBlock: {
            marginBottom: 10,
        },
        entryHeaderRow: {
            flexDirection:  isRtl ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems:     'flex-start',
            marginBottom:   2,
        },
        entryLeft: {
            flex:      1,
            alignItems: isRtl ? 'flex-end' : 'flex-start',
        },
        entryTitle: {
            fontWeight: 'bold',
            fontSize:   11,
            color:      '#111827',
            textAlign,
        },
        entrySubtitle: {
            fontStyle: 'italic',
            color:     '#374151',
            fontSize:  10,
            textAlign,
        },
        entryDate: {
            fontSize:    9.5,
            color:       '#6b7280',
            textAlign:   isRtl ? 'left' : 'right',
            flexShrink:  0,
            marginLeft:  isRtl ? 0 : 8,
            marginRight: isRtl ? 8 : 0,
        },
        entryDescription: {
            marginTop: 4,
            fontSize:  10,
            color:     '#374151',
            textAlign,
        },
        entryMeta: {
            fontSize:  9.5,
            color:     '#6b7280',
            marginTop: 2,
            textAlign,
        },

        // ── Skills ────────────────────────────────────────────────────────────
        skillsWrap: {
            flexDirection: isRtl ? 'row-reverse' : 'row',
            flexWrap:      'wrap',
            marginTop:     4,
        },
        skillBadge: {
            backgroundColor: '#eff6ff',
            borderWidth:     1,
            borderColor:     '#bfdbfe',
            borderStyle:     'solid',
            borderRadius:    4,
            paddingHorizontal: 7,
            paddingVertical:   3,
            marginRight:  isRtl ? 0 : 5,
            marginLeft:   isRtl ? 5 : 0,
            marginBottom: 5,
            fontSize:     9,
            color:        '#1e40af',
        },

        // ── Two-column layout (certs + languages) ─────────────────────────────
        twoCol: {
            flexDirection: isRtl ? 'row-reverse' : 'row',
        },
        colLeft: {
            flex:       1,
            paddingRight: isRtl ? 0 : 12,
            paddingLeft:  isRtl ? 12 : 0,
        },
        colRight: {
            flex: 1,
        },

        // ── Language entries ──────────────────────────────────────────────────
        langRow: {
            flexDirection:  isRtl ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            marginBottom:   5,
        },
        langName: {
            fontWeight: 'bold',
            fontSize:   10,
            textAlign,
        },
        langLevel: {
            fontSize:  9.5,
            color:     '#6b7280',
            textAlign: isRtl ? 'left' : 'right',
        },
    });
};

// ─── Helper: section heading ──────────────────────────────────────────────────

function SectionHeading({
    labelKey,
    direction,
    styles,
}: {
    labelKey:  LabelKey;
    direction: 'ltr' | 'rtl';
    styles:    ReturnType<typeof createStyles>;
}) {
    return (
        <Text style={styles.sectionTitle}>
            {LABELS[labelKey][direction]}
        </Text>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ClassicTemplateProps {
    draft: ResumeDraft;
}

export function ClassicTemplate({ draft }: ClassicTemplateProps) {
    const {
        direction,
        personalInfo,
        summary,
        experiences,
        educations,
        skills,
        languages,
        certifications,
    } = draft;

    const styles = createStyles(direction);
    const dir    = direction;

    // Build contact items as flat text/link nodes so we can interleave separators
    const contactItems: React.ReactNode[] = [];

    const pushContact = (node: React.ReactNode) => {
        if (contactItems.length > 0) {
            contactItems.push(
                <Text key={`sep-${contactItems.length}`} style={styles.contactSep}>·</Text>
            );
        }
        contactItems.push(node);
    };

    if (personalInfo.email) {
        pushContact(
            <Link key="email" style={styles.link} src={`mailto:${personalInfo.email}`}>
                {personalInfo.email}
            </Link>
        );
    }
    if (personalInfo.phone)    pushContact(<Text key="phone">{personalInfo.phone}</Text>);
    if (personalInfo.location) pushContact(<Text key="loc">{personalInfo.location}</Text>);
    if (personalInfo.linkedin) {
        pushContact(
            <Link key="li" style={styles.link} src={personalInfo.linkedin}>LinkedIn</Link>
        );
    }
    if (personalInfo.github) {
        pushContact(
            <Link key="gh" style={styles.link} src={personalInfo.github}>GitHub</Link>
        );
    }
    if (personalInfo.website) {
        pushContact(
            <Link key="web" style={styles.link} src={personalInfo.website}>Portfolio</Link>
        );
    }

    return (
        <Document
            title={draft.title || 'Resume'}
            author={personalInfo.fullName}
            subject="Curriculum Vitae"
            language={dir === 'rtl' ? 'ar' : 'en'}
            creator="InnoAccess Resume Builder"
            producer="@react-pdf/renderer"
        >
            <Page size="A4" style={styles.page}>

                {/* ── Header ────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.name}>{personalInfo.fullName || 'Your Name'}</Text>
                    <View style={styles.contactRow}>
                        {contactItems}
                    </View>
                </View>

                {/* ── Professional Summary ───────────────────────────────── */}
                {summary.trim() && (
                    <View style={styles.section}>
                        <SectionHeading labelKey="summary" direction={dir} styles={styles} />
                        <Text style={styles.entryDescription}>{summary}</Text>
                    </View>
                )}

                {/* ── Work Experience ────────────────────────────────────── */}
                {experiences.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeading labelKey="experience" direction={dir} styles={styles} />
                        {experiences.map((exp) => (
                            <View key={exp.clientId} style={styles.entryBlock} wrap={false}>
                                <View style={styles.entryHeaderRow}>
                                    <View style={styles.entryLeft}>
                                        <Text style={styles.entryTitle}>{exp.jobTitle}</Text>
                                        <Text style={styles.entrySubtitle}>
                                            {exp.company}{exp.location ? ` — ${exp.location}` : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.entryDate}>
                                        {exp.startDate}
                                        {' – '}
                                        {exp.isCurrent ? LABELS.present[dir] : (exp.endDate || LABELS.present[dir])}
                                    </Text>
                                </View>
                                {exp.description.trim() && (
                                    <Text style={styles.entryDescription}>{exp.description}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Education ─────────────────────────────────────────── */}
                {educations.length > 0 && (
                    <View style={styles.section}>
                        <SectionHeading labelKey="education" direction={dir} styles={styles} />
                        {educations.map((edu) => (
                            <View key={edu.clientId} style={styles.entryBlock} wrap={false}>
                                <View style={styles.entryHeaderRow}>
                                    <View style={styles.entryLeft}>
                                        <Text style={styles.entryTitle}>{edu.institution}</Text>
                                        <Text style={styles.entrySubtitle}>
                                            {edu.degree}{edu.fieldOfStudy ? ` — ${edu.fieldOfStudy}` : ''}
                                        </Text>
                                    </View>
                                    <Text style={styles.entryDate}>
                                        {edu.startDate}
                                        {edu.endDate ? ` – ${edu.endDate}` : ''}
                                    </Text>
                                </View>
                                {edu.grade && (
                                    <Text style={styles.entryMeta}>
                                        {LABELS.grade[dir]}: {edu.grade}
                                    </Text>
                                )}
                                {edu.description.trim() && (
                                    <Text style={styles.entryDescription}>{edu.description}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Skills ────────────────────────────────────────────── */}
                {skills.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <SectionHeading labelKey="skills" direction={dir} styles={styles} />
                        <View style={styles.skillsWrap}>
                            {skills.map((skill) => (
                                <View key={skill.clientId} style={styles.skillBadge}>
                                    <Text>{skill.name} · {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Certifications + Languages (two-column) ───────────── */}
                {(certifications.length > 0 || languages.length > 0) && (
                    <View style={styles.twoCol}>

                        {/* Certifications */}
                        {certifications.length > 0 && (
                            <View style={styles.colLeft}>
                                <SectionHeading labelKey="certifications" direction={dir} styles={styles} />
                                {certifications.map((cert) => (
                                    <View key={cert.clientId} style={styles.entryBlock} wrap={false}>
                                        <Text style={styles.entryTitle}>{cert.name}</Text>
                                        <Text style={styles.entrySubtitle}>{cert.issuer}</Text>
                                        {(cert.issueDate || cert.expiryDate) && (
                                            <Text style={styles.entryMeta}>
                                                {cert.issueDate}{cert.expiryDate ? ` – ${cert.expiryDate}` : ''}
                                            </Text>
                                        )}
                                        {cert.credentialUrl && (
                                            <Link style={styles.link} src={cert.credentialUrl}>
                                                <Text style={{ ...styles.entryMeta, color: '#2563eb' }}>
                                                    View credential
                                                </Text>
                                            </Link>
                                        )}
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Languages */}
                        {languages.length > 0 && (
                            <View style={styles.colRight}>
                                <SectionHeading labelKey="languages" direction={dir} styles={styles} />
                                {languages.map((lang) => (
                                    <View key={lang.clientId} style={styles.langRow} wrap={false}>
                                        <Text style={styles.langName}>{lang.name}</Text>
                                        <Text style={styles.langLevel}>
                                            {lang.proficiency.charAt(0).toUpperCase() + lang.proficiency.slice(1)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}

                    </View>
                )}

            </Page>
        </Document>
    );
}
