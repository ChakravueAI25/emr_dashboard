import { useRef, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { ChevronLeft, ChevronRight, CheckCircle, X, ArrowLeft } from 'lucide-react';
import { PatientDetailsCard } from '../PatientDetailsCard';
import { VitalSignsCard } from '../VitalSignsCard';
import { AppointmentsCard } from '../AppointmentsCard';
import { MedicationsCard } from '../MedicationsCard';
import { OptometryCard } from '../OptometryCard';
import { IOPCard } from '../IOPCard';
import { OphthalmicInvestigationsCard } from '../OphthalmicInvestigationsCard';
import { SystemicInvestigationsCard } from '../SystemicInvestigationsCard';
import { OphthalmologistExaminationCard } from '../OphthalmologistExaminationCard';
import { SpecialExaminationCard } from '../SpecialExaminationCard';
import { MedicationPrescribedCard } from '../MedicationPrescribedCard';
import { InvestigationsSurgeriesCard } from '../InvestigationsSurgeriesCard';
import { AiSummaryPanel } from '../AiSummaryPanel';
import { PatientData, UserRole, ROLES, CARD_ACCESS } from '../patient';

import { useMemo } from 'react';

interface PatientDashboardProps {
    activePatientData: PatientData | null;
    userRole: UserRole | null;
    updateActivePatientData: (path: (string | number)[], value: any) => void;
    visitIndex: number;
    totalVisits: number;
    setVisitIndex: React.Dispatch<React.SetStateAction<number>>;
    handlePrevVisit: () => void;
    handleNextVisit: () => void;
    isPatientDischarged: boolean;
    handleReceptionCompleteCheckIn: () => Promise<void>;
    handleOPDSave: () => Promise<void>;
    handleDoctorSave: () => Promise<void>;
    handleAdminSave?: () => Promise<void>;
    setActivePatientData: (data: PatientData | null) => void;
    setIsPatientDischarged: (discharged: boolean) => void;
    setCurrentView: (view: any) => void;
    newVisit: boolean;
}

export const PatientDashboard = ({
    activePatientData,
    userRole,
    updateActivePatientData,
    visitIndex,
    totalVisits,
    setVisitIndex,
    handlePrevVisit,
    handleNextVisit,
    isPatientDischarged,
    handleReceptionCompleteCheckIn,
    handleOPDSave,
    handleDoctorSave,
    handleAdminSave,
    setActivePatientData,
    setIsPatientDischarged,
    setCurrentView,
    newVisit
}: PatientDashboardProps) => {

    const [showAiPanel, setShowAiPanel] = useState(false);

    // MEMOIZED DATA SANITIZATION (Legacy Data Fix)
    // Legacy SQL-imported patients often lack nested structures (e.g. optometry.vision.unaided).
    // This memoized proxy ensures all expected fields exist before rendering child cards.
    // It is defined early so it can be used by helper functions like getCardHasData.
    const memoizedData = useMemo(() => {
        const d = activePatientData;
        if (!d) return null;

        // Recursive merge or just shallow default checks for major sections
        return {
            ...d,
            patientDetails: d.patientDetails || { name: '', age: '', sex: '', phone: '' },
            medicalHistory: {
                ...d.medicalHistory,
                // Ensure familyHistory is a string if it's missing or an array
                familyHistory: Array.isArray(d.medicalHistory?.familyHistory) 
                    ? d.medicalHistory.familyHistory.join(', ') 
                    : (d.medicalHistory?.familyHistory || '')
            },
            optometry: {
                vision: {
                    unaided: d.optometry?.vision?.unaided || { rightEye: '', leftEye: '' },
                    withGlass: d.optometry?.vision?.withGlass || { rightEye: '', leftEye: '' },
                    withPinhole: d.optometry?.vision?.withPinhole || { rightEye: '', leftEye: '' },
                    bestCorrected: d.optometry?.vision?.bestCorrected || { rightEye: '', leftEye: '' },
                    colourVision: d.optometry?.vision?.colourVision || { rightEye: '', leftEye: '' },
                    contrastSensitivity: d.optometry?.vision?.contrastSensitivity || { rightEye: '', leftEye: '' },
                },
                autoRefraction: {
                    ...d.optometry?.autoRefraction,
                    ur: d.optometry?.autoRefraction?.ur || { sph: '', cyl: '', axis: '' },
                    dr: d.optometry?.autoRefraction?.dr || { sph: '', cyl: '', axis: '' },
                    cyclo: d.optometry?.autoRefraction?.cyclo || { sph: '', cyl: '', axis: '' },
                },
                finalGlasses: d.optometry?.finalGlasses || { rightEye: {}, leftEye: {} },
                currentGlasses: d.optometry?.currentGlasses || { rightEye: {}, leftEye: {} },
                oldGlass: d.optometry?.oldGlass || { rightEye: {}, leftEye: {} },
                keratometry: d.optometry?.keratometry || { rightEye: { k1: {}, k2: {} }, leftEye: { k1: {}, k2: {} } },
                additional: d.optometry?.additional || { gpAdvisedFor: '', gpAdvisedBy: '', useOfGlass: '', product: '' },
            },
            iop: d.iop || { iopReadings: [], chartData: [] },
            ophthalmicInvestigations: d.ophthalmicInvestigations || { oct: {}, biometry: {}, pachymetry: {}, colourVision: {}, ffa: '', hvf: '', otherInvestigations: [] },
            systemicInvestigations: d.systemicInvestigations || { bloodTests: [], vitals: { bp: { value: '' }, pulse: { value: '' }, rbs: { value: '' }, rp: { value: '' } } },
            ophthalmologistExamination: d.ophthalmologistExamination || {},
            specialExamination: d.specialExamination || {},
            medicationPrescribed: d.medicationPrescribed || { items: [] },
            investigationsSurgeries: d.investigationsSurgeries || { investigations: [], surgeries: [] }
        };
    }, [activePatientData]);

    const visibleCards = useMemo(() => userRole ? CARD_ACCESS[userRole] : [], [userRole]);

    // Returns true when a card has meaningful saved data → drives the green-tick badge
    const getCardHasData = (cardName: string): boolean => {
        // Use memoizedData if available for safety, otherwise fall back to raw
        // This ensures the same sanitization rules apply to the "Done" badge check
        const data = memoizedData || activePatientData;
        
        if (!data) return false;
        switch (cardName) {
            case 'PatientDetailsCard':
                return !!(data.patientDetails?.name?.trim() && data.patientDetails.name !== 'Not Assigned');
            case 'VitalSignsCard':
                return (data.presentingComplaints?.complaints ?? []).some(c => c.complaint?.trim() !== '');
            case 'AppointmentsCard':
                const family = data.medicalHistory?.familyHistory;
                // Double safety: handle array, string, or other types
                const hasFamily = Array.isArray(family) 
                    ? family.length > 0
                    : (typeof family === 'string' ? !!family.trim() : !!family);
                
                return (data.medicalHistory?.medical ?? []).length > 0
                    || (data.medicalHistory?.surgical ?? []).length > 0
                    || hasFamily;
            case 'MedicationsCard':
                return (data.drugHistory?.currentMeds ?? []).length > 0
                    || (data.drugHistory?.allergies ?? []).length > 0;
            case 'OptometryCard': {
                const v = data.optometry?.vision;
                return !!(v?.unaided?.rightEye || v?.unaided?.leftEye
                    || v?.withGlass?.rightEye || v?.withGlass?.leftEye
                    || v?.bestCorrected?.rightEye || v?.bestCorrected?.leftEye);
            }
            case 'IOPCard':
                return (data.iop?.iopReadings ?? []).length > 0;
            case 'OphthalmicInvestigationsCard': {
                const inv = data.ophthalmicInvestigations;
                if (!inv) return false;
                return !!(inv.oct?.od?.cmt || inv.oct?.od?.rnfl || inv.biometry?.od
                    || inv.pachymetry?.od || (inv.otherInvestigations ?? []).length > 0
                    || inv.colourVision?.od || inv.ffa || inv.hvf);
            }
            case 'SystemicInvestigationsCard': {
                const sys = data.systemicInvestigations;
                if (!sys) return false;
                return (sys.bloodTests ?? []).length > 0
                    || !!(sys.vitals?.bp?.value)
                    || !!(sys.vitals?.pulse?.value)
                    || !!(sys.vitals?.rbs?.value)
                    || !!(sys.vitals?.rp?.value);
            }
            case 'OphthalmologistExaminationCard': {
                const ex = data.ophthalmologistExamination;
                if (!ex) return false;
                return !!(ex.visualAcuity || ex.lensOD || ex.lensOS || ex.remarks);
            }
            case 'SpecialExaminationCard': {
                const sp = data.specialExamination;
                return !!(sp && Object.keys(sp).length > 0);
            }
            case 'MedicationPrescribedCard':
                return (data.medicationPrescribed?.items ?? []).length > 0;
            case 'InvestigationsSurgeriesCard': {
                const is = data.investigationsSurgeries;
                if (!is) return false;
                return (is.investigations ?? []).length > 0 || (is.surgeries ?? []).length > 0;
            }
            default:
                return false;
        }
    };

    const renderCard = (cardName: string, CardComponent: React.ElementType, props: any) => {
        const isVisible = visibleCards.includes(cardName);

        // Determine which dashboard row the card belongs to
        const cardRow = (name: string) => {
            const row1 = ['PatientDetailsCard', 'VitalSignsCard', 'AppointmentsCard', 'MedicationsCard'];
            const row2 = ['OptometryCard', 'IOPCard', 'OphthalmicInvestigationsCard', 'SystemicInvestigationsCard'];
            const row3 = ['OphthalmologistExaminationCard', 'SpecialExaminationCard', 'MedicationPrescribedCard', 'InvestigationsSurgeriesCard'];
            if (row1.includes(name)) return 1;
            if (row2.includes(name)) return 2;
            if (row3.includes(name)) return 3;
            return 0;
        };

        const row = cardRow(cardName);

        // Default editability: start permissive, then apply role-specific rules below
        let isEditableForRole = true;
        let containerClass = 'transition-all duration-300';

        // OPD-specific behavior:
        // - Row 1: show the most recent patient details as read-only
        // - Row 2: editable for OPD
        // - Row 3: visible but blurred/disabled
        if (userRole === ROLES.OPD) {
            if (row === 1) {
                isEditableForRole = true;
            } else if (row === 2) {
                isEditableForRole = true;
            } else if (row === 3) {
                // blur the third row even if visible
                containerClass += ' blur-sm pointer-events-none opacity-50';
            }
        }

        // DOCTOR-specific behavior:
        // - Row 1: populated from receptionist/OPD and read-only
        // - Row 2: populated from OPD and read-only
        // - Row 3: unlocked and editable for doctor
        if (userRole === ROLES.DOCTOR) {
            // Doctor can edit everything in active documentation
            isEditableForRole = true;
        }

        // PATIENT (Admin) specific behavior:
        // - Can edit everything
        if (userRole === ROLES.PATIENT) {
            isEditableForRole = true;
        }

        // RECEPTIONIST-specific behavior:
        // - Only Patient Details Card active, others blurred (Visual Verify Mode)
        if (userRole === ROLES.RECEPTIONIST) {
            if (cardName !== 'PatientDetailsCard') {
                containerClass += ' blur-sm pointer-events-none opacity-50';
            }
        }

        // If the card isn't visible for the role, blur/disable it
        if (!isVisible) containerClass += ' blur-sm pointer-events-none opacity-50';

        const hasData = getCardHasData(cardName);

        return (
            <div className={`${containerClass} relative`}>
                {/* Green tick badge — always visible when card has saved data */}
                {hasData && (
                    <div className="absolute top-2.5 right-10 z-20 pointer-events-none flex items-center gap-1 bg-green-500/20 border border-green-500/40 rounded-full px-2 py-0.5">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 text-[9px] font-bold uppercase tracking-wide">Done</span>
                    </div>
                )}
                <CardComponent
                    isEditable={isEditableForRole}
                    {...props}
                />
            </div>
        );
    };


    // Force a re-render/ref check when data changes
    if (!activePatientData) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#8B8B8B]">
                <div className="w-20 h-20 rounded-[32px] bg-[#0f0f0f] border border-[#D4A574] flex items-center justify-center mb-8 shadow-2xl">
                    <Search className="w-10 h-10 opacity-20 text-[#D4A574]" />
                </div>
                <h2 className="text-2xl font-light text-white mb-3 tracking-wide">Ready for Arrivals</h2>
                <p className="max-w-xs text-xs leading-relaxed opacity-60 uppercase tracking-widest font-bold">
                    Select a patient from the {userRole === 'opd' ? 'OPD' : 'Clinic'} queue on the left to start documentation.
                </p>
            </div>
        );
    }


    return (
        <>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    {/* <p className="text-[10px] font-bold text-[#D4A574] uppercase tracking-[0.3em] mb-1">Active Documentation</p> */}
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-white tracking-tight">{memoizedData?.patientDetails?.name || 'Unknown Patient'}</h2>
                        {/* History Navigation for Doctors - Global for all cards */}
                        {userRole === ROLES.DOCTOR && totalVisits > 1 && (
                            <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-lg p-1 border border-[#D4A574] ml-2">
                                <button
                                    onClick={handlePrevVisit}
                                    disabled={visitIndex >= totalVisits - 1}
                                    className="p-1 hover:bg-[#2a2a2a] rounded text-[#8B8B8B] disabled:opacity-30 disabled:cursor-not-allowed hover:text-white transition-colors"
                                    title="Previous Visit (Older)"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="text-[10px] font-mono font-bold text-[#D4A574] px-2 min-w-[60px] text-center uppercase tracking-wide">
                                    {visitIndex === 0 ? 'Current' : `Visit -${visitIndex}`}
                                </span>
                                <button
                                    onClick={handleNextVisit}
                                    disabled={visitIndex === 0}
                                    className="p-1 hover:bg-[#2a2a2a] rounded text-[#8B8B8B] disabled:opacity-30 disabled:cursor-not-allowed hover:text-white transition-colors"
                                    title="Next Visit (Newer)"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Contextual Action Button based on Role - Hidden when patient is discharged */}
                    {userRole === ROLES.RECEPTIONIST && !isPatientDischarged && (
                        <button
                            onClick={handleReceptionCompleteCheckIn}
                            className="flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-[#0a0a0a] rounded-2xl hover:bg-[#C9955E] transition-all text-sm font-bold shadow-xl"
                        >
                            <CheckCircle className="w-4 h-4" /> Save & Pass to OPD
                        </button>
                    )}
                    {userRole === ROLES.OPD && !isPatientDischarged && (
                        <button
                            onClick={handleOPDSave}
                            className="flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-[#0a0a0a] rounded-2xl hover:bg-[#C9955E] transition-all text-sm font-bold shadow-xl"
                        >
                            <CheckCircle className="w-4 h-4" /> Move to Doctor
                        </button>
                    )}
                    {userRole === ROLES.DOCTOR && !isPatientDischarged && (
                        <>
                            <button
                                onClick={() => setShowAiPanel(true)}
                                className="flex items-center gap-2 px-5 py-3 bg-[#1a1a1a] border border-[#D4A574] text-[#D4A574] rounded-2xl hover:bg-[#D4A574] hover:text-[#0a0a0a] transition-all text-sm font-bold shadow-xl"
                            >
                                <Sparkles className="w-4 h-4" /> AI Summary
                            </button>
                            <button
                                onClick={handleDoctorSave}
                                className="flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-[#0a0a0a] rounded-2xl hover:bg-[#C9955E] transition-all text-sm font-bold shadow-xl"
                            >
                                <CheckCircle className="w-4 h-4" /> Finalize & Discharge
                            </button>
                        </>
                    )}
                    {userRole === ROLES.PATIENT && handleAdminSave && (
                        <button
                            onClick={handleAdminSave}
                            className="flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-[#0a0a0a] rounded-2xl hover:bg-[#C9955E] transition-all text-sm font-bold shadow-xl"
                        >
                            <CheckCircle className="w-4 h-4" /> Save Changes
                        </button>
                    )}

                </div>
            </div>

            {/* When new visit: ONLY show Personal Details Card */}
            {newVisit ? (
                <div className="grid grid-cols-4 gap-6 mb-6">
                    {renderCard('PatientDetailsCard', PatientDetailsCard, { data: memoizedData?.patientDetails, updateData: updateActivePatientData, isEditable: userRole === ROLES.RECEPTIONIST || userRole === ROLES.DOCTOR || userRole === ROLES.OPD || userRole === ROLES.PATIENT })}
                </div>
            ) : (
                <>
                    {/* Discharged Patient Banner */}
                    {isPatientDischarged && (
                        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-4">
                            <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                                <span className="text-amber-500 text-lg">ðŸ”’</span>
                            </div>
                            <div>
                                <p className="text-amber-500 font-bold text-sm">Read-Only Mode - Patient Discharged</p>
                                <p className="text-amber-500/70 text-xs">This visit has been completed. To add new data, book a new appointment.</p>
                            </div>
                        </div>
                    )}

                    <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {renderCard('PatientDetailsCard', PatientDetailsCard, { data: memoizedData?.patientDetails, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.RECEPTIONIST || userRole === ROLES.DOCTOR || userRole === ROLES.OPD)) })}
                        {renderCard('VitalSignsCard', VitalSignsCard, {
                            data: memoizedData?.presentingComplaints,
                            updateData: updateActivePatientData,
                            isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.RECEPTIONIST || userRole === ROLES.DOCTOR)),
                            // Task 2: Visit Navigation (Doctor only)
                            showVisitNav: userRole === 'doctor',
                            visitIndex: visitIndex,
                            totalVisits: totalVisits,
                            onPrevVisit: () => setVisitIndex(prev => Math.min(prev + 1, totalVisits - 1)),
                            onNextVisit: () => setVisitIndex(prev => Math.max(prev - 1, 0)),
                            isViewingPastVisit: visitIndex > 0,
                            fullScreen: true
                        })}
                        {renderCard('AppointmentsCard', AppointmentsCard, { data: memoizedData?.medicalHistory, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.RECEPTIONIST || userRole === ROLES.DOCTOR)) })}
                        {renderCard('MedicationsCard', MedicationsCard, { data: memoizedData?.drugHistory, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.RECEPTIONIST || userRole === ROLES.DOCTOR)) })}
                    </div>

                    <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {renderCard('OptometryCard', OptometryCard, {
                            data: memoizedData?.optometry,
                            updateData: updateActivePatientData,
                            isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.DOCTOR)),
                            // Task 2: Visit Navigation (Doctor only)
                            showVisitNav: userRole === 'doctor',
                            visitIndex: visitIndex,
                            totalVisits: totalVisits,
                            onPrevVisit: () => setVisitIndex(prev => Math.min(prev + 1, totalVisits - 1)),
                            onNextVisit: () => setVisitIndex(prev => Math.max(prev - 1, 0)),
                            isViewingPastVisit: visitIndex > 0
                        })}
                        {renderCard('IOPCard', IOPCard, { data: memoizedData?.iop, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.DOCTOR)) })}
                        {renderCard('OphthalmicInvestigationsCard', OphthalmicInvestigationsCard, { data: memoizedData?.ophthalmicInvestigations, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.DOCTOR)) })}
                        {renderCard('SystemicInvestigationsCard', SystemicInvestigationsCard, { data: memoizedData?.systemicInvestigations, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.OPD || userRole === ROLES.DOCTOR)) })}
                    </div>

                    <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                        {renderCard('OphthalmologistExaminationCard', OphthalmologistExaminationCard, { data: memoizedData?.ophthalmologistExamination, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.DOCTOR)) })}
                        {renderCard('SpecialExaminationCard', SpecialExaminationCard, { data: memoizedData?.specialExamination, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.DOCTOR)) })}
                        {renderCard('MedicationPrescribedCard', MedicationPrescribedCard, { data: memoizedData?.medicationPrescribed, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.DOCTOR)) })}
                        {renderCard('InvestigationsSurgeriesCard', InvestigationsSurgeriesCard, { data: memoizedData?.investigationsSurgeries, updateData: updateActivePatientData, isEditable: userRole === ROLES.PATIENT || (!isPatientDischarged && (userRole === ROLES.DOCTOR)) })}
                    </div>
                </>
            )}

            {/* AI Summary Panel Modal */}
            {showAiPanel && (
                <AiSummaryPanel
                    patientName={memoizedData?.patientDetails?.name || 'Unknown'}
                    registrationId={memoizedData?.patientDetails?.registrationId || ''}
                    mongoId={activePatientData?.mongoId || ''}
                    onClose={() => setShowAiPanel(false)}
                />
            )}
        </>
    );
}
