import pymysql

# Use PyMySQL as a drop-in replacement for mysqlclient (no C build tools needed on Windows).
pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()
