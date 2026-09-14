import SwiftUI
import UIKit

/// Das aufgeschlagene Buch: zwei Seiten nebeneinander, Falz in der Mitte.
/// Beim Wischen dreht sich das Blatt in echtem 3-D um die Mitte –
/// das ist Apples eigene Buch-Animation (`UIPageViewController`, `pageCurl`).
struct BookPager<Content: View>: UIViewControllerRepresentable {
    /// Anzahl aller Seiten (jede Seite ist ein Tag).
    let pageCount: Int
    /// Index der linken Seite – immer geradzahlig.
    @Binding var leftIndex: Int
    let content: (Int) -> Content

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIViewController(context: Context) -> UIPageViewController {
        let controller = UIPageViewController(
            transitionStyle: .pageCurl,
            navigationOrientation: .horizontal,
            options: [.spineLocation: UIPageViewController.SpineLocation.mid.rawValue]
        )
        controller.dataSource = context.coordinator
        controller.delegate = context.coordinator
        controller.isDoubleSided = true
        controller.view.backgroundColor = .clear
        context.coordinator.apply(spread: leftIndex, to: controller, animated: false, direction: .forward)
        return controller
    }

    func updateUIViewController(_ controller: UIPageViewController, context: Context) {
        context.coordinator.parent = self
        context.coordinator.refreshPages()

        let shown = controller.viewControllers?.first.flatMap { context.coordinator.index(of: $0) }
        if let shown, shown != leftIndex {
            // eine Doppelseite weiter oder zurück: mit Umblätter-Animation
            let nachbar = abs(shown - leftIndex) == 2
            context.coordinator.apply(
                spread: leftIndex,
                to: controller,
                animated: nachbar,
                direction: leftIndex > shown ? .forward : .reverse
            )
        } else if shown == nil {
            context.coordinator.apply(spread: leftIndex, to: controller, animated: false)
        }
    }

    final class Coordinator: NSObject, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
        var parent: BookPager
        private var pages: [Int: UIHostingController<Content>] = [:]

        init(_ parent: BookPager) {
            self.parent = parent
        }

        func page(at index: Int) -> UIHostingController<Content>? {
            guard index >= 0, index < parent.pageCount else { return nil }
            if let existing = pages[index] {
                existing.rootView = parent.content(index)
                return existing
            }
            let host = UIHostingController(rootView: parent.content(index))
            host.view.backgroundColor = .clear
            pages[index] = host
            return host
        }

        func index(of controller: UIViewController) -> Int? {
            pages.first { $0.value === controller }?.key
        }

        func refreshPages() {
            for (index, host) in pages where index < parent.pageCount {
                host.rootView = parent.content(index)
            }
        }

        /// Zeigt die Doppelseite, die links mit `spread` beginnt.
        func apply(spread: Int,
                   to controller: UIPageViewController,
                   animated: Bool,
                   direction: UIPageViewController.NavigationDirection = .forward) {
            let left = max(0, spread - (spread % 2))
            guard let leftPage = page(at: left) else { return }
            var shown = [leftPage]
            if let rightPage = page(at: left + 1) {
                shown.append(rightPage)
            }
            controller.setViewControllers(shown, direction: direction, animated: animated)
        }

        private func dropDistantPages(around index: Int) {
            pages = pages.filter { abs($0.key - index) <= 4 }
        }

        func pageViewController(_ pageViewController: UIPageViewController,
                                viewControllerBefore viewController: UIViewController) -> UIViewController? {
            guard let current = index(of: viewController) else { return nil }
            return page(at: current - 1)
        }

        func pageViewController(_ pageViewController: UIPageViewController,
                                viewControllerAfter viewController: UIViewController) -> UIViewController? {
            guard let current = index(of: viewController) else { return nil }
            return page(at: current + 1)
        }

        func pageViewController(_ pageViewController: UIPageViewController,
                                didFinishAnimating finished: Bool,
                                previousViewControllers: [UIViewController],
                                transitionCompleted completed: Bool) {
            guard completed,
                  let shown = pageViewController.viewControllers?.first,
                  let current = index(of: shown) else { return }
            let left = current - (current % 2)
            if parent.leftIndex != left {
                parent.leftIndex = left
            }
            dropDistantPages(around: left)
        }
    }
}
