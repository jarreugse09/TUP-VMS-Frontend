import React from 'react';
import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Data Controller',
    body: 'Technological University of the Philippines',
  },
  {
    title: 'Personal Data Collected',
    body: 'Full name, email address, profile photo, QR code value, attendance records (time-in/out), visit logs, transaction logs, vehicle plate number (optional), and work schedule.',
  },
  {
    title: 'Purpose of Collection',
    body: 'Campus access control, attendance monitoring, workforce management, visitor tracking, and security incident response.',
  },
  {
    title: 'Who Can Access Personal Data',
    body: 'superadmin: all records. hr_head / hr_staff: workforce data for TUP and Staff roles. dean: college-scoped faculty and department_head records. department_head: department-scoped faculty records. security_head / security_staff: visitor and student records. Individual users: their own records only.',
  },
  {
    title: 'Data Retention',
    body: 'Records are retained for 5 years (1825 days) from the last recorded activity, subject to manual review by the Data Protection Officer when retention thresholds are exceeded.',
  },
  {
    title: 'Your Rights Under DPA 2012',
    body: 'You may request access to your personal data, correction of inaccurate records, erasure through the Data Protection Officer, objection to processing, and data portability where applicable.',
  },
  {
    title: 'Contact',
    body: 'TUP Data Protection Officer\nEmail: dpo@tup.edu.ph\nAddress: TUP Manila',
  },
];

const PrivacyNotice: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
            Privacy Notice
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            TUP Visitor Management System
          </h1>
          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            This notice explains how the Technological University of the Philippines
            processes personal data in compliance with Republic Act No. 10173 or the
            Data Privacy Act of 2012.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <h2 className="text-lg font-semibold text-slate-900">
                {section.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700 sm:text-base">
                {section.body}
              </p>
            </section>
          ))}
        </div>

        <div className="mt-8">
          <Link
            to="/register"
            className="inline-flex items-center rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Back to Registration
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyNotice;
