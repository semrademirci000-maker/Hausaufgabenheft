import SwiftUI
import UIKit

/// Blättern wie in einem echten Buch: Wischen dreht die Seite in 3-D um.
/// (UIPageViewController mit `pageCurl` – das ist die echte Buch-Animation von iOS.)
struct PageCurlPager<Content: View>: UIViewControllerRepresentable {
    let pageCount: Int
    @Binding var index: Int
    let content: (Int) -> Content

    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }

    func makeUIViewController(context: Context) -> UIPageViewController {
        let controller = UIPageViewController(
            transitionStyle: .pageCurl,
            navigationOrientation: .horizontal,
            options: [.spineLocation: UIPageViewController.SpineLocation.min.rawValue]
        )
        controller.dataSource = context.coordinator
        controller.delegate = context.coordinator
        controller.isDoubleSided = false
        controller.view.backgroundColor = .clear

        if let first = context.coordinator.page(at: index) {
            controller.setViewControllers([first], direction: .forward, animated: false)
        }
        return controller
    }

    func updateUIViewController(_ controller: UIPageViewController, context: Context) {
        context.coordinator.parent = self
        context.coordinator.refreshPages()

        let shown = controller.viewControllers?.first.flatMap { context.coordinator.index(of: $0) }
        if shown != index, let target = context.coordinator.page(at: index) {
            let direction: UIPageViewController.NavigationDirection = (shown ?? 0) <= index ? .forward : .reverse
            controller.setViewControllers([target], direction: direction, animated: false)
        }
    }

    final class Coordinator: NSObject, UIPageViewControllerDataSource, UIPageViewControllerDelegate {
        var parent: PageCurlPager
        private var pages: [Int: UIHostingController<Content>] = [:]

        init(_ parent: PageCurlPager) {
            self.parent = parent
        }

        /// Seite für einen Index – wird gemerkt, damit das Blättern flüssig bleibt.
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

        /// Inhalte aktualisieren, wenn sich Hausaufgaben oder Stundenplan ändern.
        func refreshPages() {
            for (index, host) in pages where index < parent.pageCount {
                host.rootView = parent.content(index)
            }
        }

        private func dropDistantPages(around index: Int) {
            pages = pages.filter { abs($0.key - index) <= 2 }
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
            if parent.index != current {
                parent.index = current
            }
            dropDistantPages(around: current)
        }
    }
}
