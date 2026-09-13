import SwiftUI

/// Fach für eine Stunde auswählen.
struct SubjectPickerView: View {
    let day: Weekday
    let period: Int

    @EnvironmentObject private var store: PlannerStore
    @Environment(\.dismiss) private var dismiss

    private var currentID: UUID? {
        store.data.timetable.subjectID(day, period)
    }

    var body: some View {
        List {
            Section {
                ForEach(store.data.subjects) { subject in
                    Button {
                        store.setLesson(subject.id, day: day, period: period)
                        dismiss()
                    } label: {
                        HStack(spacing: 12) {
                            RoundedRectangle(cornerRadius: 4, style: .continuous)
                                .fill(subject.color)
                                .frame(width: 14, height: 14)
                            Text(subject.name)
                                .font(Theme.font(16))
                                .foregroundStyle(Theme.ink)
                            Spacer()
                            if currentID == subject.id {
                                Image(systemName: "checkmark")
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundStyle(Theme.accent)
                            }
                        }
                    }
                }
            }

            Section {
                Button {
                    store.setLesson(nil, day: day, period: period)
                    dismiss()
                } label: {
                    Text("Frei – keine Stunde")
                        .font(Theme.font(16))
                        .foregroundStyle(Theme.secondaryInk)
                }
                NavigationLink {
                    SubjectsManagerView()
                        .navigationTitle("Fächer")
                        .navigationBarTitleDisplayMode(.inline)
                } label: {
                    Text("Fächer und Farben")
                        .font(Theme.font(16))
                        .foregroundStyle(Theme.ink)
                }
            }
        }
        .navigationTitle("\(day.longName), \(period). Stunde")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Abbrechen") { dismiss() }
            }
        }
    }
}
