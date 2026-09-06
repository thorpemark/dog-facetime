import Foundation

enum KeywordRulesLoader {
    static func load(from bundle: Bundle = .main) -> KeywordRulesConfig? {
        guard let url = bundle.url(forResource: "keyword_rules", withExtension: "json"),
              let data = try? Data(contentsOf: url) else {
            return nil
        }
        return try? JSONDecoder().decode(KeywordRulesConfig.self, from: data)
    }
}
