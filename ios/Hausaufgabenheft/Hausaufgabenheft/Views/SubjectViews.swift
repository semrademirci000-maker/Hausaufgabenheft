//
//  SubjectViews.swift
//  Fach auswählen und Fächer verwalten.
//

import SwiftUI

// MARK: - Fach für eine Stunde auswählen

struct SubjectPickerView: View {
    let day: Int
    let period: Int

    @EnvironmentObject private var planner: Planner
    @Environment(\.dismiss) private var dismiss

    @State private var showNewSubject = false
    @State private var newName = ""

    private let columns = [GridItem(.adaptive(minimum: 130), spacing: 10)]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(planner.subjects) { subject in
                        Button {
                            planner.setLesson(day: day, period: period, subjectID: subject.id)
                            dismiss()
                        } label: {
                            Text(subject.name)
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(.white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(Capsule().fill(subject.color))
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()

                HStack(spacing: 10) {
                    Button("Leer lassen") {
                        planner.setLesson(day: day, period: period, subjectID: nil)
                        dismiss()
                    }
                    .buttonStyle(SoftButtonStyle())

                    Button("+ Neues Fach") {
                        newName = ""
                        showNewSubject = true
                    }
                    .buttonStyle(SoftButtonStyle(tint: .planBlue, textColor: .white))
                }
                .padding(.horizontal)
            }
            .background(Color.deskLight.ignoresSafeArea())
            .navigationTitle("\(SchoolDay.names[day]) · \(period + 1). Stunde")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { dismiss() }
                }
            }
            .alert("Neues Fach", isPresented: $showNewSubject) {
                TextField("Name des Fachs", text: $newName)
                Button("Abbrechen", role: .cancel) { }
                Button("Anlegen") {
                    let name = newName.trimmingCharacters(in: .whitespaces)
                    let subject = planner.addSubject(name: name.isEmpty ? "Neues Fach" : name)
                    planner.setLesson(day: day, period: period, subjectID: subject.id)
                    dismiss()
                }
            } message: {
                Text("Die Farbe kannst du danach unter „Fächer“ ändern.")
            }
        }
    }
}

// MARK: - Fächer verwalten

struct SubjectManagerView: View {
    @EnvironmentObject private var planner: Planner
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach($planner.subjects) { $subject in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 10) {
                            Circle()
                                .fill(subject.color)
                                .frame(width: 22, height: 22)
                            TextField("Name", text: $subject.name)
                                .font(.system(size: 17, weight: .semibold))
                                .onSubmit { planner.save() }
                        }

                        HStack(spacing: 8) {
                            ForEach(Palette.colors, id: \.self) { hex in
                                Button {
                                    subject.colorHex = hex
                                    planner.save()
                                } label: {
                                    Circle()
                                        .fill(Color(hex: hex))
                                        .frame(width: 26, height: 26)
                                        .overlay(
                                            Circle().stroke(Color.ink,
                                                            lineWidth: subject.colorHex == hex ? 3 : 0)
                                        )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                }
                .onDelete { indexSet in
                    let doomed = indexSet.compactMap { index -> Subject? in
                        planner.subjects.indices.contains(index) ? planner.subjects[index] : nil
                    }
                    doomed.forEach { planner.deleteSubject($0) }
                }
            }
            .navigationTitle("Meine Fächer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("+ Fach") { planner.addSubject() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") {
                        planner.save()
                        dismiss()
                    }
                }
            }
            .onDisappear { planner.save() }
        }
    }
}
