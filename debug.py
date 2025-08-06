import sysconfig

print("get_path:\t\t\t", sysconfig.get_path("scripts"))
print("get_preferred_scheme:\t\t", sysconfig.get_preferred_scheme("user"))
print(
    "get_path(get_preferred_scheme):\t",
    sysconfig.get_path("scripts", sysconfig.get_preferred_scheme("user")),
)
