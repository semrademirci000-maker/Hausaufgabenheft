import SwiftUI

/// Fächer anlegen, umbenennen, Farbe wechseln oder löschen.
struct SubjectsManagerView: View {
    @EnvironmentObject private var store: PlannerStore
    @State private var newName = ""
    @State private var expandedSubject: UUID?

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("z. B. Erdkunde", text: $newName)
                        .font(Theme.font(16, .medium))
                        .onSubmit(addSubject)
                    Button(action: addSubject) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Theme.blue)
                    }
                    .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            } header: {
                Text("Neues Fach")
            }

            Section {
                ForEach($store.data.subjects) { $subject in
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 12) {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) {
                                    expandedSubject = (expandedSubject == subject.id) ? nil : subject.id
                                }
                            } label: {
                                RoundedRectangle(cornerRadius: 7, style: .continuous)
                                    .fill(subject.color)
                                    .frame(width: 30, height: 30)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 7, style: .continuous)
                                            .strokeBorder(Color.black.opacity(0.12), lineWidth: 1)
                                    )
                            }
                            .buttonStyle(.plain)

                            TextField("Name", text: $subject.name)
                                .font(Theme.font(17, .semibold))

                            Image(systemName: expandedSubject == subject.id ? "chevron.up" : "chevron.down")
                                .font(.footnote.bold())
                                .foregroundStyle(Theme.softInk)
                        }

                        if expandedSubject == subject.id {
                            ColorPaletteGrid(colorHex: $subject.colorHex)
                                .padding(.bottom, 4)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .onDelete { offsets in
                    store.deleteSubjects(at: offsets)
                }
            } header: {
                Text("Meine Fächer")
            } footer: {
                Text("Tippe auf das farbige Kästchen, um die Farbe zu wechseln. Zum Löschen nach links wischen.")
            }
        }
    }

    private func addSubject() {
        let name = newName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        store.addSubject(name: name)
        newName = ""
    }
}

/// Farbauswahl aus der Palette.
struct ColorPaletteGrid: View {
    @Binding var colorHex: String

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 8)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 8) {
            ForEach(Theme.palette, id: \.self) { hex in
                Circle()
                    .fill(Color(hex: hex))
                    .frame(height: 30)
                    .overlay(
                        Circle()
                            .strokeBorder(Color.black.opacity(0.12), lineWidth: 1)
                    )
                    .overlay(
                        Image(systemName: "checkmark")
                            .font(.caption.bold())
                            .foregroundStyle(.white)
                            .opacity(hex == colorHex ? 1 : 0)
                    )
                    .onTapGesture { colorHex = hex }
                    .accessibilityLabel(Text("Farbe \(hex)"))
            }
        }
    }
}

#Preview {
    NavigationStack {
        SubjectsManagerView()
            .navigationTitle("Fächer")
    }
    .environmentObject(PlannerStore())
}
