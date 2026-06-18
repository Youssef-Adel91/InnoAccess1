import React from 'react';
import {
    Document,
    Page,
    Text,
    View,
    StyleSheet,
    Font,
    Link,
} from '@react-pdf/renderer';
import type { ResumeDraft } from '@/store/useResumeStore';

// ─── Font Registration ────────────────────────────────────────────────────────

// Register an Arabic-supporting font (Amiri) so that RTL characters render correctly.
// We also register a standard English font (Roboto) for LTR resumes.
// Important: @react-pdf/renderer requires absolute URLs or valid paths for fonts.
Font.register({
    family: 'Amiri',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/amiri/v26/J7aRnpd8CGxCG8ScyA.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/amiri/v26/J7aanpd8CGxCG8SUUQ-1_w.ttf', fontWeight: 'bold' },
    ],
});

Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 'normal' },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 'bold' },
    ],
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (direction: 'ltr' | 'rtl') => {
    const isRtl = direction === 'rtl';
    const fontFamily = isRtl ? 'Amiri' : 'Roboto';

    // The textAlign property determines alignment. For RTL, text usually aligns right.
    const textAlign = isRtl ? 'right' : 'left';

    return StyleSheet.create({
        page: {
            padding: 40,
            fontFamily,
            fontSize: 11,
            color: '#333333',
            lineHeight: 1.5,
            backgroundColor: '#ffffff',
            // Note: @react-pdf/renderer has limited flex-direction support for RTL
            // We handle layout alignment via textAlign and flex rules.
        },
        header: {
            marginBottom: 20,
            textAlign: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#dddddd',
            borderBottomStyle: 'solid',
            paddingBottom: 15,
        },
        name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: 5,
            textAlign: 'center',
        },
        contactRow: {
            flexDirection: isRtl ? 'row-reverse' : 'row',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 10,
            fontSize: 10,
            color: '#555555',
        },
        contactItem: {
            marginHorizontal: 5,
        },
        link: {
            color: '#0056b3',
            textDecoration: 'none',
        },
        section: {
            marginBottom: 15,
        },
        sectionTitle: {
            fontSize: 14,
            fontWeight: 'bold',
            color: '#000000',
            textTransform: 'uppercase',
            marginBottom: 8,
            paddingBottom: 3,
            borderBottomWidth: 1,
            borderBottomColor: '#eeeeee',
            borderBottomStyle: 'solid',
            textAlign,
        },
        itemBlock: {
            marginBottom: 10,
        },
        itemHeaderRow: {
            flexDirection: isRtl ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 3,
        },
        itemTitle: {
            fontWeight: 'bold',
            fontSize: 12,
            color: '#111111',
            textAlign,
        },
        itemSubtitle: {
            fontStyle: 'italic',
            color: '#444444',
            textAlign,
        },
        itemDate: {
            fontSize: 10,
            color: '#666666',
        },
        itemDescription: {
            marginTop: 4,
            textAlign,
            color: '#444444',
        },
        skillRow: {
            flexDirection: isRtl ? 'row-reverse' : 'row',
            flexWrap: 'wrap',
            gap: 5,
            marginTop: 5,
        },
        skillBadge: {
            backgroundColor: '#f3f4f6',
            paddingHorizontal: 6,
            paddingVertical: 3,
            borderRadius: 3,
            fontSize: 9,
            color: '#374151',
            marginRight: isRtl ? 0 : 5,
            marginLeft: isRtl ? 5 : 0,
            marginBottom: 5,
        },
    });
};

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

    // Helpers to combine contact details safely
    const contactLinks = [
        personalInfo.email && <Link style={styles.link} src={`mailto:${personalInfo.email}`}>{personalInfo.email}</Link>,
        personalInfo.phone,
        personalInfo.location,
        personalInfo.linkedin && <Link style={styles.link} src={personalInfo.linkedin}>LinkedIn</Link>,
        personalInfo.github && <Link style={styles.link} src={personalInfo.github}>GitHub</Link>,
        personalInfo.website && <Link style={styles.link} src={personalInfo.website}>Portfolio</Link>,
    ].filter(Boolean);

    // RTL Note: @react-pdf/renderer <Document> supports language/direction metadata,
    // but actual RTL layout must be composed manually via flex-direction: row-reverse.
    return (
        <Document
            title={draft.title || 'Resume'}
            author={personalInfo.fullName}
            subject="Curriculum Vitae"
            language={direction === 'rtl' ? 'ar' : 'en'}
        >
            {/* The tagged prop is crucial for PDF/UA Accessibility */}
            <Page size="A4" style={styles.page}>
                
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <Text style={styles.name}>{personalInfo.fullName || 'Your Name'}</Text>
                    <View style={styles.contactRow}>
                        {contactLinks.map((item, i) => (
                            <React.Fragment key={i}>
                                <Text style={styles.contactItem}>{item}</Text>
                                {i < contactLinks.length - 1 && <Text>|</Text>}
                            </React.Fragment>
                        ))}
                    </View>
                </View>

                {/* ── Summary ────────────────────────────────────────────── */}
                {summary && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {direction === 'rtl' ? 'الملخص المهني' : 'Professional Summary'}
                        </Text>
                        <Text style={styles.itemDescription}>{summary}</Text>
                    </View>
                )}

                {/* ── Experience ─────────────────────────────────────────── */}
                {experiences.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {direction === 'rtl' ? 'الخبرة العملية' : 'Work Experience'}
                        </Text>
                        {experiences.map((exp) => (
                            <View key={exp.clientId} style={styles.itemBlock} wrap={false}>
                                <View style={styles.itemHeaderRow}>
                                    <View>
                                        <Text style={styles.itemTitle}>{exp.jobTitle}</Text>
                                        <Text style={styles.itemSubtitle}>{exp.company} {exp.location ? `— ${exp.location}` : ''}</Text>
                                    </View>
                                    <Text style={styles.itemDate}>
                                        {exp.startDate} - {exp.isCurrent ? (direction === 'rtl' ? 'الآن' : 'Present') : exp.endDate}
                                    </Text>
                                </View>
                                {exp.description && (
                                    <Text style={styles.itemDescription}>{exp.description}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Education ──────────────────────────────────────────── */}
                {educations.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            {direction === 'rtl' ? 'التعليم' : 'Education'}
                        </Text>
                        {educations.map((edu) => (
                            <View key={edu.clientId} style={styles.itemBlock} wrap={false}>
                                <View style={styles.itemHeaderRow}>
                                    <View>
                                        <Text style={styles.itemTitle}>{edu.institution}</Text>
                                        <Text style={styles.itemSubtitle}>{edu.degree} in {edu.fieldOfStudy}</Text>
                                    </View>
                                    <Text style={styles.itemDate}>
                                        {edu.startDate} - {edu.endDate || (direction === 'rtl' ? 'الآن' : 'Present')}
                                    </Text>
                                </View>
                                {edu.grade && <Text style={{ ...styles.itemDescription, fontSize: 10, marginTop: 2 }}>Grade: {edu.grade}</Text>}
                                {edu.description && (
                                    <Text style={styles.itemDescription}>{edu.description}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                )}

                {/* ── Skills ─────────────────────────────────────────────── */}
                {skills.length > 0 && (
                    <View style={styles.section} wrap={false}>
                        <Text style={styles.sectionTitle}>
                            {direction === 'rtl' ? 'المهارات' : 'Skills'}
                        </Text>
                        <View style={styles.skillRow}>
                            {skills.map((skill) => (
                                <View key={skill.clientId} style={styles.skillBadge}>
                                    <Text>{skill.name} ({skill.level})</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* ── Certifications & Languages (Grid) ────────────────── */}
                <View style={{ flexDirection: direction === 'rtl' ? 'row-reverse' : 'row', justifyContent: 'space-between' }}>
                    
                    {/* Certifications */}
                    {certifications.length > 0 && (
                        <View style={{ flex: 1, paddingRight: direction === 'rtl' ? 0 : 15, paddingLeft: direction === 'rtl' ? 15 : 0 }}>
                            <Text style={styles.sectionTitle}>
                                {direction === 'rtl' ? 'الشهادات' : 'Certifications'}
                            </Text>
                            {certifications.map((cert) => (
                                <View key={cert.clientId} style={styles.itemBlock}>
                                    <Text style={styles.itemTitle}>{cert.name}</Text>
                                    <Text style={styles.itemSubtitle}>{cert.issuer}</Text>
                                    {(cert.issueDate || cert.expiryDate) && (
                                        <Text style={styles.itemDate}>
                                            {cert.issueDate} {cert.expiryDate ? `- ${cert.expiryDate}` : ''}
                                        </Text>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Languages */}
                    {languages.length > 0 && (
                        <View style={{ flex: 1 }}>
                            <Text style={styles.sectionTitle}>
                                {direction === 'rtl' ? 'اللغات' : 'Languages'}
                            </Text>
                            {languages.map((lang) => (
                                <View key={lang.clientId} style={{ marginBottom: 5 }}>
                                    <Text style={styles.itemTitle}>{lang.name}</Text>
                                    <Text style={styles.itemDescription}>{lang.proficiency}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                </View>
            </Page>
        </Document>
    );
}
