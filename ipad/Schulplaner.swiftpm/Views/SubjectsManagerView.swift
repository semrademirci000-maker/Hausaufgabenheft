import SwiftUI

/// Fächer anlegen, umbenennen, Farbe wechseln, löschen.
struct SubjectsManagerView: View {
    @EnvironmentObject private var store: PlannerStore
    @State private var newName = ""
    @State private var expandedSubject: UUID?

    var body: some View {
        List {
            Section {
                ForEach($store.data.subjects) { $subject in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(spacing: 12) {
                            Button {
                                withAnimation(.easeInOut(duration: 0.18)) {
                                    expandedSubject = (expandedSubject == subject.id) ? nil : subject.id
                                }
                            } label: {
                                RoundedRectangle(cornerRadius: 5, style: .continuous)
                                    .fill(subject.color)
                                    .frame(width: 18, height: 18)
                            }
                            .buttonStyle(.plain)

                            TextField("Name", text: $subject.name)
                                .font(Theme.font(16))

                            Image(systemName: expandedSubject == subject.id ? "chevron.up" : "chevron.down")
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundStyle(Theme.tertiaryInk)
                        }

                        if expandedSubject == subject.id {
                            ColorPaletteGrid(colorHex: $subject.colorHex)
                                .padding(.bottom, 2)
                        }
                    }
                    .padding(.vertical, 3)
                }
                .onDelete { offsets in
                    store.deleteSubjects(at: offsets)
                }
            } footer: {
                Text("Farbe: auf das Kästchen tippen. Löschen: nach links wischen.")
                    .font(Theme.font(12))
            }

            Section {
                HStack {
                    TextField("Neues Fach", text: $newName)
                        .font(Theme.font(16))
                        .onSubmit(addSubject)
                    Button(action: addSubject) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 20))
                            .foregroundStyle(Theme.accent)
                    }
                    .buttonStyle(.plain)
                    .disabled(newName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
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
                    .frame(height: 26)
                    .overlay(
                        Image(systemName: "checkmark")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(.white)
                            .opacity(hex == colorHex ? 1 : 0)
                    )
                    .onTapGesture { colorHex = hex }
                    .accessibilityLabel(Text("Farbe"))
            }
        }
        .padding(.vertical, 2)
    }
}

struct SubjectsManagerView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            SubjectsManagerView()
                .navigationTitle("Fächer")
        }
        .environmentObject(PlannerStore())
    }
}
