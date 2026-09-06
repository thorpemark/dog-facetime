import AVFoundation
import Combine
import Foundation
import Speech

/// On-device speech recognition with phrase matching.
///
/// ## Porcupine integration point
/// For lower-latency, always-on wake-word detection, replace or augment this class
/// with Picovoice Porcupine. Porcupine runs a lightweight on-device model for
/// specific keywords without full STT overhead. Suggested integration:
/// 1. Add Porcupine iOS SDK via SPM or CocoaPods.
/// 2. Create `PorcupineKeywordSpotter` conforming to `KeywordSpotting` protocol.
/// 3. Run Porcupine on a background audio tap for wake words; keep Speech STT for
///    longer phrases like "good boy" or "come here".
/// 4. Inject the preferred spotter in `CallViewModel` based on user settings.
@MainActor
protocol KeywordSpotting: AnyObject {
    var onMatch: ((String) -> Void)? { get set }
    func startListening(rules: [KeywordRule], dogName: String, ownerName: String)
    func stopListening()
}

@MainActor
final class KeywordSpotter: NSObject, ObservableObject, KeywordSpotting {
    @Published var isListening = false
    @Published var lastTranscript = ""
    @Published var authorizationStatus: SFSpeechRecognizerAuthorizationStatus = .notDetermined

    var onMatch: ((String) -> Void)?

    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private let audioEngine = AVAudioEngine()
    private var rules: [KeywordRule] = []
    private var dogName = ""
    private var ownerName = ""
    private var lastMatchTime: Date = .distantPast
    private let matchCooldown: TimeInterval = 2.0

    override init() {
        super.init()
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        speechRecognizer?.defaultTaskHint = .dictation
    }

    func requestAuthorization() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                Task { @MainActor in
                    self.authorizationStatus = status
                    continuation.resume(returning: status == .authorized)
                }
            }
        }
    }

    func startListening(rules: [KeywordRule], dogName: String, ownerName: String) {
        self.rules = rules.sorted { $0.priority > $1.priority }
        self.dogName = dogName
        self.ownerName = ownerName
        guard authorizationStatus == .authorized else { return }
        startRecognition()
    }

    func stopListening() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionRequest = nil
        recognitionTask = nil
        isListening = false
    }

    private func startRecognition() {
        stopListening()

        guard let speechRecognizer, speechRecognizer.isAvailable else { return }

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest else { return }

        recognitionRequest.shouldReportPartialResults = true
        if #available(iOS 13, *) {
            recognitionRequest.requiresOnDeviceRecognition = speechRecognizer.supportsOnDeviceRecognition
        }

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self else { return }
            if let result {
                Task { @MainActor in
                    self.processTranscript(result.bestTranscription.formattedString)
                }
            }
            if error != nil || (result?.isFinal ?? false) {
                Task { @MainActor in
                    self.restartIfNeeded()
                }
            }
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isListening = true
        } catch {
            print("[KeywordSpotter] Audio engine failed: \(error.localizedDescription)")
        }
    }

    private func processTranscript(_ transcript: String) {
        lastTranscript = transcript
        let now = Date()
        guard now.timeIntervalSince(lastMatchTime) >= matchCooldown else { return }

        for rule in rules {
            if rule.matches(transcript: transcript, dogName: dogName, ownerName: ownerName) {
                lastMatchTime = now
                onMatch?(rule.id)
                return
            }
        }
    }

    private func restartIfNeeded() {
        guard isListening else { return }
        startRecognition()
    }
}
