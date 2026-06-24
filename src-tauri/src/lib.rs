use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let migrations = vec![
    // Define your migrations here
    Migration {
      version: 1,
      description: "create_initial_tables",
      sql: include_str!("migrations/001_init.sql"),
      kind: MigrationKind::Up,
    },
    Migration {
      version: 2,
      description: "add_admin_user",
      sql: "INSERT INTO users (username, password_hash, role) VALUES('admin', 'admin', 'ADMIN')",
      kind: MigrationKind::Up,
    },
    Migration {
      version: 3,
      description: "add_employee_user",
      sql: "INSERT INTO users (username, password_hash, role) VALUES('local', 'local', 'LOCAL')",
      kind: MigrationKind::Up,
    }
  ];


    tauri::Builder::default()
        .plugin(
          tauri_plugin_sql::Builder::new()
            .add_migrations("sqlite:test.db", migrations)
            .build()
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
