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
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(subject.color)
                                .frame(width: 26, height: 26)
                            Text(subject.name)
                                .font(Theme.font(17, .semibold))
                                .foregroundStyle(Theme.ink)
                            Spacer()
                            if currentID == subject.id {
                                Image(systemName: "checkmark")
                                    .font(.body.bold())
                                    .foregroundStyle(Theme.blue)
                            }
                        }
                    }
                }
            } header: {
                Text("Fach wählen")
            }

            Section {
                Button {
                    store.setLesson(nil, day: day, period: period)
                    dismiss()
                } label: {
                    Label("Frei – keine Stunde", systemImage: "minus.circle")
                }
                NavigationLink {
                    SubjectsManagerView()
                        .navigationTitle("Fächer")
                } label: {
                    Label("Fächer und Farben ändern", systemImage: "paintpalette")
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
