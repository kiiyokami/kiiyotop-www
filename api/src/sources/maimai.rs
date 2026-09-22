use crate::model::Maimai;
use std::path::Path;

/// Reads the standing maimai record from disk.
///
/// Returns `None` on a missing, unreadable or malformed file. A bad data file
/// degrades to an absent cell, the same as a failed fetch, and never stops startup.
pub fn load(path: &Path) -> Option<Maimai> {
    let raw = std::fs::read_to_string(path)
        .map_err(|e| tracing::warn!(?path, error = %e, "maimai file unreadable, serving null"))
        .ok()?;

    toml::from_str::<Maimai>(&raw)
        .map_err(|e| tracing::warn!(?path, error = %e, "maimai file malformed, serving null"))
        .ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn write_temp(contents: &str) -> tempfile::NamedTempFile {
        let mut f = tempfile::NamedTempFile::new().unwrap();
        f.write_all(contents.as_bytes()).unwrap();
        f
    }

    #[test]
    fn a_well_formed_file_parses() {
        let f = write_temp(
            r#"
            rating  = 2000
            average = 133.3
            dan     = "八段"
            class   = "B5"
            stars   = 248
            plays   = 1079
            url     = "https://example.invalid/profile"
            "#,
        );
        let m = load(f.path()).expect("should parse");
        assert_eq!(m.rating, 2000);
        assert_eq!(m.dan, "八段");
        assert_eq!(m.plays, 1079);
    }

    #[test]
    fn a_missing_file_is_none_and_does_not_panic() {
        assert!(load(Path::new("/nonexistent/maimai.toml")).is_none());
    }

    #[test]
    fn a_malformed_file_is_none_and_does_not_panic() {
        let f = write_temp("rating = \"not a number\"\n");
        assert!(load(f.path()).is_none());
    }

    #[test]
    fn a_file_missing_a_required_field_is_none() {
        let f = write_temp("rating = 2000\n");
        assert!(load(f.path()).is_none());
    }
}
