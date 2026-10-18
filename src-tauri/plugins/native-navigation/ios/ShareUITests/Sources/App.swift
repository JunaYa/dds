import UIKit
@main class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = Host()
        window?.makeKeyAndVisible()
        return true
    }
}
class Host: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBackground
        let button = UIButton(type: .system)
        button.setTitle("Share test backup", for: .normal)
        button.frame = CGRect(x: 40, y: 200, width: 300, height: 60)
        button.addAction(UIAction { [weak self] _ in
            let file = Bundle.main.url(forResource: "Test", withExtension: "calibabybackup")!
            self?.present(UIActivityViewController(activityItems: [file], applicationActivities: nil), animated: true)
        }, for: .touchUpInside)
        view.addSubview(button)
    }
}
