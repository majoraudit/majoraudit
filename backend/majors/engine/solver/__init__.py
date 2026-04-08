from typing import overload, Generic, Literal, TypeVar

from . import v1
from . import v2

API_LATEST = 2

T = TypeVar("T")


class Solver(Generic[T]):
    @overload
    def __init__(self: "Solver[v1.SolveResult]", ser_ver: Literal[1]) -> None: ...
    
    @overload
    def __init__(self: "Solver[v2.SolveResult]", ser_ver: Literal[2]) -> None: ...

    def __init__(self, ser_ver: int = API_LATEST) -> None:
        self.ser_ver = ser_ver

        if ser_ver == 1:
            self.mod = v1
        elif ser_ver == 2:
            self.mod = v2
        else:
            raise ValueError(f"Unsupported ser_ver: {ser_ver}")
            
    @overload
    def solve(
        self: "Solver[v1.SolveResult]",
        matching_eval: dict,
        include_query: bool = False,
    ) -> v1.SolveResult: ...

    @overload
    def solve(
        self: "Solver[v2.SolveResult]",
        matching_eval: dict,
        include_query: bool = False,
    ) -> v2.SolveResult: ...
            
    def solve(self, matching_eval: dict, include_query: bool = False) -> v1.SolveResult | v2.SolveResult:
        return self.mod.solve(
            matching_eval=matching_eval,
            include_query=include_query,
        )
